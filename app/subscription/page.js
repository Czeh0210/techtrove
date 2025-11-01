'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Pricing } from '@/components/pricing';
import { Button } from '@/components/ui/button';
import { Home, MessageSquare, LayoutDashboard, CreditCard, CheckCircle, XCircle } from 'lucide-react';

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCancelMessage, setShowCancelMessage] = useState(false);

  // Check for success/cancel parameters
  useEffect(() => {
    if (searchParams.get('success')) {
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
    if (searchParams.get('canceled')) {
      setShowCancelMessage(true);
      setTimeout(() => setShowCancelMessage(false), 5000);
    }
  }, [searchParams]);

  const handleSubscribe = async (priceId, planName) => {
    if (planName === 'Free' || priceId === 'free') {
      // Free plan - no payment needed
      alert('You are on the Free plan!');
      return;
    }

    setIsLoading(true);
    setLoadingPlan(planName);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          planName: planName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setIsLoading(false);
        setLoadingPlan(null);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
      setIsLoading(false);
      setLoadingPlan(null);
    }
  };

  // Price IDs from environment variables
  const PRICE_PRO = 'price_1SOZiCPMKOwL3SJTmI7p9Xrk';
  const PRICE_PROMAX = 'price_1SOZicPMKOwL3SJTmTZsu7i0';

  const plans = [
    {
      name: 'Free',
      price: '0',
      yearlyPrice: '0',
      period: 'month',
      description: 'Perfect for getting started',
      features: [
        'Basic account features',
        'Up to 2 bank accounts',
        'Standard transaction tracking',
        'Email support',
        'Mobile app access',
      ],
      buttonText: 'Get Started',
      href: '#',
      isPopular: false,
      priceId: 'free',
      onClick: () => handleSubscribe('free', 'Free'),
    },
    {
      name: 'Pro',
      price: '18',
      yearlyPrice: '14',
      period: 'month',
      description: 'Best for growing businesses',
      features: [
        'Everything in Free',
        'Unlimited bank accounts',
        'Advanced analytics',
        'Priority email support',
        'API access',
        'Custom reports',
        'Export transactions',
      ],
      buttonText: isLoading && loadingPlan === 'Pro' ? 'Processing...' : 'Subscribe Now',
      href: '#',
      isPopular: true,
      priceId: PRICE_PRO,
      onClick: () => handleSubscribe(PRICE_PRO, 'Pro'),
    },
    {
      name: 'Pro Max',
      price: '38',
      yearlyPrice: '30',
      period: 'month',
      description: 'For large enterprises',
      features: [
        'Everything in Pro',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom integrations',
        'White-label options',
        'Advanced security features',
        'Team collaboration tools',
        'Audit logs',
      ],
      buttonText: isLoading && loadingPlan === 'Pro Max' ? 'Processing...' : 'Subscribe Now',
      href: '#',
      isPopular: false,
      priceId: PRICE_PROMAX,
      onClick: () => handleSubscribe(PRICE_PROMAX, 'Pro Max'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Simple Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">TechTrove</span>
            </div>
            <div className="flex gap-2">
              <Link href="/chatbot">
                <Button variant="ghost" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link href="/chatbot">
                <Button variant="ghost" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Chatbot</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="default" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Subscription</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 sm:pt-32">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="container mx-auto px-4 mb-6">
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 flex items-center gap-3 shadow-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Subscription Successful!</h3>
                <p className="text-sm text-green-700">Thank you for subscribing. Your payment has been processed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Message */}
        {showCancelMessage && (
          <div className="container mx-auto px-4 mb-6">
            <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4 flex items-center gap-3 shadow-lg">
              <XCircle className="h-6 w-6 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-900">Subscription Cancelled</h3>
                <p className="text-sm text-orange-700">Your subscription was cancelled. You can try again anytime.</p>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4">
          <Pricing
            plans={plans.map(plan => ({
              ...plan,
              href: '#',
            }))}
            title="Choose Your Plan"
            description="Simple, transparent pricing for everyone. No hidden fees."
          />
        </div>
      </main>
    </div>
  );
}