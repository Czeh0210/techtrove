// Test MongoDB connection
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import clientPromise from '../lib/mongodb.js';

async function testConnection() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const client = await clientPromise;
    const db = client.db('myDatabase');
    
    console.log('✅ Connected successfully to MongoDB!');
    console.log('📊 Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    // Test query
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log('👥 Users count:', userCount);
    
    const transactions = db.collection('transactions');
    const txCount = await transactions.countDocuments();
    console.log('💰 Transactions count:', txCount);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

testConnection();
