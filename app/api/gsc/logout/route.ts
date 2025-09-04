import { serialize } from 'cookie';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Create a cookie that is expired
  const cookie = serialize('gsc_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1, // Expire the cookie immediately
    path: '/',
    sameSite: 'lax',
  });

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  
  // Set the expired cookie in the response headers to clear it from the browser
  response.headers.set('Set-Cookie', cookie);
  
  return response;
}