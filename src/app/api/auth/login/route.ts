import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const fetchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await fetchRes.json();

    if (!fetchRes.ok || !data.success) {
      return NextResponse.json({ error: data.error || 'Invalid credentials' }, { status: 401 });
    }

    const user = { role: data.role, username };

    // Very simple authentication using cookies for this prototype
    const cookieStore = await cookies();
    cookieStore.set('session_role', user.role, { httpOnly: true, path: '/' });
    cookieStore.set('session_user', user.username, { httpOnly: true, path: '/' });

    return NextResponse.json({ role: user.role, success: true });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
