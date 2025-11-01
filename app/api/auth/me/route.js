import { NextResponse } from 'next/server';
import { userFromToken } from '../../../../lib/data-mongo';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    const token = m[1];
    const user = await userFromToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    return NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName });
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
