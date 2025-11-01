import clientPromise from '@/lib/mongodb';

export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    const allUsers = await users.find({}).toArray();
    const allTransactions = await transactions.find({}).toArray();
    
    return Response.json({
      users: allUsers,
      transactions: allTransactions
    });
  } catch (error) {
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
}
