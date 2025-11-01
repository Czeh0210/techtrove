import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, amount, type, description, daysAgo = 0 } = body;

    if (!username || !amount || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');

    // Find user
    const user = await users.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate timestamp (subtract days)
    const timestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);

    // Create transaction
    const id = `t${Math.random().toString(36).slice(2, 9)}`;
    const amt = (type === 'transaction' || type === 'cash-out' || type === 'transfer-out') 
      ? -Math.abs(Number(amount)) 
      : Math.abs(Number(amount));

    const tx = {
      id,
      userId: user.id,
      amount: amt,
      type,
      description: description || '',
      timestamp
    };

    await transactions.insertOne(tx);

    // Update user balance
    await users.updateOne(
      { id: user.id },
      { $inc: { balance: amt } }
    );

    // Get new balance
    const updatedUser = await users.findOne({ id: user.id });

    return NextResponse.json({ 
      success: true, 
      transaction: tx,
      newBalance: updatedUser.balance
    });
  } catch (err) {
    console.error('Error adding transaction:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
