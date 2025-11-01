import { NextResponse } from 'next/server';
import { userFromToken, createTransaction, getTransactionsForUser, calculateBalance } from '../../../lib/data-mongo';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = m[1];
    const user = await userFromToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all';
    const list = await getTransactionsForUser(user.id, { period });
    const balance = await calculateBalance(user.id);
    
    console.log(`📋 GET /api/transactions - User: ${user.username}, Period: ${period}`);
    console.log(`   Transactions found: ${list.length}`);
    console.log(`   Transaction types:`, list.map(t => ({ type: t.type, amount: t.amount, desc: t.description?.substring(0, 30) })));
    
    return NextResponse.json({ transactions: list, balance });
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function POST(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = m[1];
    const user = await userFromToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    const body = await req.json();
    const { amount, type, description } = body;
    if (!amount || !type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const tx = await createTransaction(user.id, { amount, type, description });
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
