import { NextResponse } from 'next/server';
import { COOKIE, MAX_AGE, authConfigured, checkCredentials, createToken } from '@/lib/auth';

export async function POST(req) {
  if (!authConfigured()) {
    return NextResponse.json({ error: 'Login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and AUTH_SECRET in .env.local' }, { status: 500 });
  }
  const { username, password } = await req.json().catch(() => ({}));
  if (!(await checkCredentials(username, password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: 'Wrong username or password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
