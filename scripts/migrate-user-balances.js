// Migration script to add balance field to existing users
// Run this once to update existing user documents

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from parent directory
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import clientPromise from '../lib/mongodb.js';

async function migrateUserBalances() {
  console.log('🔄 Starting user balance migration...');
  
  try {
    const client = await clientPromise;
    const db = client.db('myDatabase');
    const users = db.collection('users');
    const transactions = db.collection('transactions');
    
    // Find all users without a balance field
    const usersToMigrate = await users.find({ balance: { $exists: false } }).toArray();
    
    console.log(`Found ${usersToMigrate.length} users to migrate`);
    
    for (const user of usersToMigrate) {
      // Calculate balance from transactions
      const result = await transactions.aggregate([
        { $match: { userId: user.id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      
      const balance = result.length > 0 ? result[0].total : 0;
      
      // Update user with balance field
      await users.updateOne(
        { id: user.id },
        { $set: { balance: balance } }
      );
      
      console.log(`✅ Updated ${user.username}: balance = RM ${balance.toFixed(2)}`);
    }
    
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUserBalances();
