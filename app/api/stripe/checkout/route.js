import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  try {
    // Check if API key exists
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Stripe configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    });

    const body = await req.json();
    const { priceId, planName } = body;

    if (!priceId || priceId === 'free') {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription?canceled=true`,
      metadata: {
        planName: planName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
