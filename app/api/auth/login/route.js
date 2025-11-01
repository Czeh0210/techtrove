import { NextResponse } from 'next/server';
import { findUser, verifyPassword, tokenForUser, initializeDemoUser } from '../../../../lib/data-mongo';

export async function POST(req) {
  try {
    // Initialize demo user if needed
    await initializeDemoUser();
    
    const body = await req.json();
    const { username, password } = body;
    const user = await findUser(username);
    if (!user || !verifyPassword(user, password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = tokenForUser(user);
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
