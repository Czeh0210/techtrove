// Simple in-memory store for prototype/demo purposes.
// Not for production.

const users = [
  { id: 'u1', username: 'demo', password: 'password', displayName: 'Demo User' },
];

let transactions = [
  // sample transaction
  { id: 't1', userId: 'u1', amount: 1000, type: 'cash-in', description: 'Initial deposit', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 40 },
  { id: 't2', userId: 'u1', amount: -50, type: 'cash-out', description: 'Coffee', timestamp: Date.now() - 1000 * 60 * 60 * 24 * 5 },
];

function findUser(username) {
  return users.find((u) => u.username === username);
}

function verifyPassword(user, password) {
  // In a real app use bcrypt/argon2
  return user && user.password === password;
}

function tokenForUser(user) {
  // Very small toy token. Replace with JWT/OAuth in real app.
  return `demo-token-${user.id}`;
}

function userFromToken(token) {
  if (!token) return null;
  const m = token.match(/^demo-token-(.+)$/);
  if (!m) return null;
  const id = m[1];
  return users.find((u) => u.id === id) || null;
}

function createTransaction(userId, { amount, type, description }) {
  const id = `t${Math.random().toString(36).slice(2, 9)}`;
  const amt = type === 'cash-out' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));
  const tx = { id, userId, amount: amt, type, description: description || '', timestamp: Date.now() };
  transactions.unshift(tx);
  return tx;
}

function getTransactionsForUser(userId, { period } = {}) {
  let list = transactions.filter((t) => t.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  if (period && period !== 'all') {
    const now = Date.now();
    let cutoff = 0;
    if (period === 'week') cutoff = now - 1000 * 60 * 60 * 24 * 7;
    if (period === 'month') cutoff = now - 1000 * 60 * 60 * 24 * 30;
    if (period === 'year') cutoff = now - 1000 * 60 * 60 * 24 * 365;
    if (cutoff) list = list.filter((t) => t.timestamp >= cutoff);
  }
  return list;
}

function calculateBalance(userId) {
  return transactions.filter((t) => t.userId === userId).reduce((s, t) => s + t.amount, 0);
}

function statementCSV(userId, { period } = {}) {
  const list = getTransactionsForUser(userId, { period });
  const lines = ["id,timestamp,type,amount,description"];
  for (const t of list) {
    lines.push(`${t.id},${new Date(t.timestamp).toISOString()},${t.type},${t.amount},"${(t.description || '').replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}

export { findUser, verifyPassword, tokenForUser, userFromToken, createTransaction, getTransactionsForUser, calculateBalance, statementCSV };
