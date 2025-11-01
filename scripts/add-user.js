// Add a new user to MongoDB
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import clientPromise from '../lib/mongodb.js';

async function addUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    // Check if demo2 already exists
    const existingUser = await users.findOne({ username: 'demo2' });
    if (existingUser) {
      console.log('⚠️  User demo2 already exists!');
      console.log('User info:', existingUser);
      process.exit(0);
    }
    
    // Create demo2 user
    const newUser = {
      id: 'u2',
      username: 'demo2',
      password: 'password',  // In real app, use bcrypt
      displayName: 'Demo User 2',
      createdAt: new Date()
    };
    
    await users.insertOne(newUser);
    console.log('✅ Created user: demo2');
    console.log('   ID:', newUser.id);
    console.log('   Display Name:', newUser.displayName);
    console.log('   Password: password');
    
    // Add initial transaction for demo2
    const initialTransaction = {
      id: 't' + Math.random().toString(36).slice(2, 9),
      userId: 'u2',
      amount: 500,
      type: 'cash-in',
      description: 'Initial deposit',
      timestamp: Date.now()
    };
    
    await transactions.insertOne(initialTransaction);
    console.log('✅ Added initial transaction: RM 500.00 (Initial deposit)');
    
    // Show user count
    const userCount = await users.countDocuments();
    console.log('\n📊 Total users in database:', userCount);
    
    // List all users
    const allUsers = await users.find({}).toArray();
    console.log('\n👥 All users:');
    allUsers.forEach(u => {
      console.log(`   - ${u.username} (${u.displayName}) [ID: ${u.id}]`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addUser();
