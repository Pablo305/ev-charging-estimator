import { NextResponse } from 'next/server';

const VALID_USERNAME = 'Admin';
const VALID_PASSWORD = 'Admin';
const SESSION_TOKEN = 'bulletev-session-v1';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('bulletev-auth', SESSION_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  }
}
