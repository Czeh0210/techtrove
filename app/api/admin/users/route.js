import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, displayName } = body;
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    // Check if user already exists
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    
    // Generate user ID
    const userCount = await users.countDocuments();
    const userId = `u${userCount + 1}`;
    
    // Create new user
    const newUser = {
      id: userId,
      username,
      password,  // In real app, use bcrypt
      displayName: displayName || username,
      createdAt: new Date()
    };
    
    await users.insertOne(newUser);
    
    // Add initial transaction
    const initialTransaction = {
      id: 't' + Math.random().toString(36).slice(2, 9),
      userId: userId,
      amount: 500,
      type: 'cash-in',
      description: 'Initial deposit',
      timestamp: Date.now()
    };
    
    await transactions.insertOne(initialTransaction);
    
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName
      },
      message: `User ${username} created successfully with RM 500.00 initial deposit`
    });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Failed to create user', details: err.message }, { status: 500 });
  }
}

// GET endpoint to list all users (for admin purposes)
export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    
    const allUsers = await users.find({}, { projection: { password: 0 } }).toArray();
    
    return NextResponse.json({
      count: allUsers.length,
      users: allUsers.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        createdAt: u.createdAt
      }))
    });
  } catch (err) {
    console.error('Error listing users:', err);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
