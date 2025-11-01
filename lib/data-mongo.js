import clientPromise from './mongodb';
import jsPDF from 'jspdf';

// Get database and collections
async function getDb() {
  const client = await clientPromise;
  return client.db('myDatabase');
}

async function getUsersCollection() {
  const db = await getDb();
  return db.collection('users');
}

async function getTransactionsCollection() {
  const db = await getDb();
  return db.collection('transactions');
}

// Initialize demo user if not exists
async function initializeDemoUser() {
  const users = await getUsersCollection();
  const demoUser = await users.findOne({ username: 'demo' });
  
  if (!demoUser) {
    await users.insertOne({
      id: 'u1',
      username: 'demo',
      password: 'password', // In real app, use bcrypt
      displayName: 'Demo User',
      balance: 950, // Initial balance after transactions
      createdAt: new Date()
    });
    
    // Add sample transactions
    const transactions = await getTransactionsCollection();
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
  }
  
  // Initialize demo2 user if not exists
  const demo2User = await users.findOne({ username: 'demo2' });
  
  if (!demo2User) {
    await users.insertOne({
      id: 'u2',
      username: 'demo2',
      password: 'password', // In real app, use bcrypt
      displayName: 'Demo User 2',
      balance: 500, // Initial balance
      createdAt: new Date()
    });
    
    console.log('✅ Created demo2 user');
    
    // Add sample transaction for demo2
    const transactions = await getTransactionsCollection();
    await transactions.insertOne({
      id: 't' + Math.random().toString(36).slice(2, 9),
      userId: 'u2',
      amount: 500,
      type: 'cash-in',
      description: 'Initial deposit',
      timestamp: Date.now()
    });
    
    console.log('✅ Added initial transaction for demo2: RM 500.00');
  }
}

async function findUser(username) {
  const users = await getUsersCollection();
  return await users.findOne({ username });
}

function verifyPassword(user, password) {
  // In a real app use bcrypt/argon2
  return user && user.password === password;
}

function tokenForUser(user) {
  // Very small toy token. Replace with JWT/OAuth in real app.
  return `demo-token-${user.id}`;
}

async function userFromToken(token) {
  if (!token) return null;
  const m = token.match(/^demo-token-(.+)$/);
  if (!m) return null;
  const id = m[1];
  const users = await getUsersCollection();
  return await users.findOne({ id }) || null;
}

async function createTransaction(userId, { amount, type, description }) {
  const transactions = await getTransactionsCollection();
  const users = await getUsersCollection();
  
  const id = `t${Math.random().toString(36).slice(2, 9)}`;
  // For closed system: transaction and cash-out are negative (spending)
  // cash-in is positive (only for initial setup, not available to users)
  const amt = (type === 'transaction' || type === 'cash-out') ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
  const tx = {
    id,
    userId,
    amount: amt,
    type,
    description: description || '',
    timestamp: Date.now()
  };
  await transactions.insertOne(tx);
  
  // Update user balance in database
  await users.updateOne(
    { id: userId },
    { $inc: { balance: amt } }
  );
  
  return tx;
}

async function transferMoney(fromUserId, toUsername, amount, description) {
  const users = await getUsersCollection();
  const transactions = await getTransactionsCollection();
  
  // Find sender user info
  const fromUser = await users.findOne({ id: fromUserId });
  if (!fromUser) {
    throw new Error('Sender user not found');
  }
  
  // Find recipient by username
  const toUser = await users.findOne({ username: toUsername });
  if (!toUser) {
    throw new Error(`User '${toUsername}' not found`);
  }
  
  // Prevent self-transfer
  if (fromUserId === toUser.id) {
    throw new Error('Cannot transfer to yourself');
  }
  
  // Check sender has sufficient balance
  const senderBalance = await calculateBalance(fromUserId);
  const transferAmount = Math.abs(Number(amount));
  
  if (senderBalance < transferAmount) {
    throw new Error(`Insufficient balance. You have RM ${senderBalance.toFixed(2)}, but need RM ${transferAmount.toFixed(2)}`);
  }
  
  // Create two transactions: one debit for sender, one credit for recipient
  const timestamp = Date.now();
  const txId1 = `t${Math.random().toString(36).slice(2, 9)}`;
  const txId2 = `t${Math.random().toString(36).slice(2, 9)}`;
  
  // Sender's transaction (debit)
  const senderTx = {
    id: txId1,
    userId: fromUserId,
    amount: -transferAmount,
    type: 'transfer-out',
    description: description || `Transfer to ${toUser.displayName || toUsername}`,
    recipientId: toUser.id,
    recipientUsername: toUsername,
    recipientDisplayName: toUser.displayName,
    timestamp
  };
  
  // Recipient's transaction (credit)
  const recipientTx = {
    id: txId2,
    userId: toUser.id,
    amount: transferAmount,
    type: 'transfer-in',
    description: description || `Transfer from ${fromUser.displayName || fromUser.username}`,
    senderId: fromUserId,
    senderUsername: fromUser.username,
    senderDisplayName: fromUser.displayName,
    timestamp
  };
  
  // Insert both transactions
  await transactions.insertMany([senderTx, recipientTx]);
  
  // Update both users' balances in database
  await users.updateOne(
    { id: fromUserId },
    { $inc: { balance: -transferAmount } }
  );
  await users.updateOne(
    { id: toUser.id },
    { $inc: { balance: transferAmount } }
  );
  
  return {
    senderTransaction: senderTx,
    recipientTransaction: recipientTx,
    recipient: {
      id: toUser.id,
      username: toUser.username,
      displayName: toUser.displayName
    }
  };
}

async function getTransactionsForUser(userId, { period, type } = {}) {
  const transactions = await getTransactionsCollection();
  const users = await getUsersCollection();
  
  let query = { userId };
  
  // Filter by type if specified
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (period && period !== 'all') {
    const now = Date.now();
    let cutoff = 0;
    if (period === 'week') cutoff = now - 1000 * 60 * 60 * 24 * 7;
    if (period === 'month') cutoff = now - 1000 * 60 * 60 * 24 * 30;
    if (period === 'year') cutoff = now - 1000 * 60 * 60 * 24 * 365;
    if (cutoff) query.timestamp = { $gte: cutoff };
  }
  
  const txList = await transactions.find(query).sort({ timestamp: -1 }).toArray();
  
  // Populate sender and recipient information for transfers
  for (const tx of txList) {
    if (tx.type === 'transfer-in' && tx.senderId) {
      // Use stored fields if available, otherwise look up
      if (tx.senderUsername || tx.senderDisplayName) {
        tx.sender = {
          id: tx.senderId,
          username: tx.senderUsername,
          displayName: tx.senderDisplayName
        };
      } else {
        const sender = await users.findOne({ id: tx.senderId });
        if (sender) {
          tx.sender = {
            id: sender.id,
            username: sender.username,
            displayName: sender.displayName
          };
        }
      }
    } else if (tx.type === 'transfer-out' && tx.recipientId) {
      // Use stored fields if available, otherwise look up
      if (tx.recipientUsername || tx.recipientDisplayName) {
        tx.recipient = {
          id: tx.recipientId,
          username: tx.recipientUsername,
          displayName: tx.recipientDisplayName
        };
      } else {
        const recipient = await users.findOne({ id: tx.recipientId });
        if (recipient) {
          tx.recipient = {
            id: recipient.id,
            username: recipient.username,
            displayName: recipient.displayName
          };
        }
      }
    }
  }
  
  return txList;
}

async function calculateBalance(userId) {
  const users = await getUsersCollection();
  const user = await users.findOne({ id: userId });
  
  // Return balance from user document, or fall back to calculating from transactions
  if (user && typeof user.balance === 'number') {
    return user.balance;
  }
  
  // Fallback: calculate from transactions if balance field doesn't exist
  const transactions = await getTransactionsCollection();
  const result = await transactions.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();
  
  return result.length > 0 ? result[0].total : 0;
}

async function statementCSV(userId, { period, type } = {}) {
  const list = await getTransactionsForUser(userId, { period, type });
  const lines = ["id,timestamp,type,amount,description"];
  for (const t of list) {
    lines.push(`${t.id},${new Date(t.timestamp).toISOString()},${t.type},${t.amount},"${(t.description || '').replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}

async function statementPDF(userId, username, { period, type } = {}) {
  const list = await getTransactionsForUser(userId, { period, type });
  const users = await getUsersCollection();
  const user = await users.findOne({ id: userId });
  
  // Create PDF document
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TechTrove Banking', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('Transaction Statement', 105, 30, { align: 'center' });
  
  // Account Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 45;
  
  doc.text(`Account Holder: ${user?.displayName || username}`, 20, yPos);
  yPos += 7;
  doc.text(`Account ID: ${userId}`, 20, yPos);
  yPos += 7;
  
  const periodLabels = {
    'week': 'Last 7 Days',
    'month': 'Last 30 Days',
    'year': 'Last 365 Days',
    'all': 'All Time'
  };
  doc.text(`Statement Period: ${periodLabels[period] || 'All Time'}`, 20, yPos);
  yPos += 7;
  
  const generatedDate = new Date().toLocaleString('en-MY', { 
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${generatedDate}`, 20, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Current Balance: RM ${(user?.balance || 0).toFixed(2)}`, 20, yPos);
  doc.setFont('helvetica', 'normal');
  
  yPos += 12;
  
  // Draw line
  doc.setDrawColor(0);
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  // Table Header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date & Time', 20, yPos);
  doc.text('Type', 65, yPos);
  doc.text('Description', 95, yPos);
  doc.text('Amount (RM)', 160, yPos, { align: 'right' });
  
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 6;
  
  // Transactions
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  let totalCredit = 0;
  let totalDebit = 0;
  
  const typeLabels = {
    'cash-in': 'Cash In',
    'transaction': 'Payment',
    'transfer-in': 'Transfer In',
    'transfer-out': 'Transfer Out'
  };
  
  if (list.length === 0) {
    doc.text('No transactions found for this period.', 105, yPos, { align: 'center' });
    yPos += 10;
  } else {
    for (const t of list) {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
        
        // Redraw header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Date & Time', 20, yPos);
        doc.text('Type', 65, yPos);
        doc.text('Description', 95, yPos);
        doc.text('Amount (RM)', 160, yPos, { align: 'right' });
        yPos += 2;
        doc.line(20, yPos, 190, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }
      
      const date = new Date(t.timestamp).toLocaleString('en-MY', { 
        timeZone: 'Asia/Kuala_Lumpur',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const type = typeLabels[t.type] || t.type;
      
      // Enhanced description with transfer details
      let description = t.description || '-';
      if (t.type === 'transfer-in' && t.sender) {
        description = `From: ${t.sender.displayName || t.sender.username} - ${t.description || 'Transfer'}`;
      } else if (t.type === 'transfer-out' && t.recipient) {
        description = `To: ${t.recipient.displayName || t.recipient.username} - ${t.description || 'Transfer'}`;
      }
      description = description.substring(0, 40);
      
      const amount = parseFloat(t.amount);
      
      // Track totals
      if (amount > 0) {
        totalCredit += amount;
      } else {
        totalDebit += Math.abs(amount);
      }
      
      const amountText = amount >= 0 ? `+${amount.toFixed(2)}` : amount.toFixed(2);
      
      // Set color for amount
      if (amount >= 0) {
        doc.setTextColor(22, 163, 74); // Green
      } else {
        doc.setTextColor(220, 38, 38); // Red
      }
      
      doc.setTextColor(0, 0, 0); // Black for other fields
      doc.text(date, 20, yPos);
      doc.text(type, 65, yPos);
      doc.text(description, 95, yPos);
      
      // Color amount
      if (amount >= 0) {
        doc.setTextColor(22, 163, 74);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(amountText, 180, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 6;
    }
  }
  
  // Summary section
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Credits (Incoming): RM ${totalCredit.toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Total Debits (Outgoing): RM ${totalDebit.toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Net Change: RM ${(totalCredit - totalDebit).toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Transaction Count: ${list.length}`, 20, yPos);
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated statement and does not require a signature.', 105, 285, { align: 'center' });
  
  // Return PDF as buffer
  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

export {
  initializeDemoUser,
  findUser,
  verifyPassword,
  tokenForUser,
  userFromToken,
  createTransaction,
  transferMoney,
  getTransactionsForUser,
  calculateBalance,
  statementCSV,
  statementPDF
};
