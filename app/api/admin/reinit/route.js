import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    console.log('🔄 Reinitializing sample transactions...');
    
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    // Clear existing transactions
    await transactions.deleteMany({});
    console.log('Cleared existing transactions');
    
    // Add sample transactions for demo user (u1)
    await transactions.insertMany([
      {
        id: 't1',
        userId: 'u1',
        amount: 1000,
        type: 'cash-in',
        description: 'Initial deposit',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 40
      },
      {
        id: 't2',
        userId: 'u1',
        amount: -50,
        type: 'transaction',
        description: 'Coffee at Starbucks',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5
      }
    ]);
    console.log('✅ Created transactions for demo user');
    
    // Add sample transaction for demo2 user (u2)
    await transactions.insertOne({
      id: 't3',
      userId: 'u2',
      amount: 500,
      type: 'cash-in',
      description: 'Initial deposit',
      timestamp: Date.now()
    });
    console.log('✅ Created transaction for demo2 user');
    
    // Update user balances
    await users.updateOne({ id: 'u1' }, { $set: { balance: 950 } });
    await users.updateOne({ id: 'u2' }, { $set: { balance: 500 } });
    console.log('✅ Updated user balances');
    
    return Response.json({
      success: true,
      message: 'Sample data reinitialized',
      balances: {
        demo: 950,
        demo2: 500
      }
    });
  } catch (error) {
    console.error('❌ Reinitialization failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
