import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    console.log('🔄 Starting user balance migration...');
    
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    // Find all users
    const allUsers = await users.find({}).toArray();
    
    console.log(`Found ${allUsers.length} users to process`);
    
    const results = [];
    
    for (const user of allUsers) {
      // Calculate balance from transactions
      const result = await transactions.aggregate([
        { $match: { userId: user.id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      
      const calculatedBalance = result.length > 0 ? result[0].total : 0;
      
      // Update user with balance field (overwrite existing balance)
      await users.updateOne(
        { id: user.id },
        { $set: { balance: calculatedBalance } }
      );
      
      results.push({
        username: user.username,
        oldBalance: user.balance,
        newBalance: calculatedBalance
      });
      
      console.log(`✅ Updated ${user.username}: ${user.balance} → RM ${calculatedBalance.toFixed(2)}`);
    }
    
    return Response.json({
      success: true,
      message: 'Migration complete',
      updated: results
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
