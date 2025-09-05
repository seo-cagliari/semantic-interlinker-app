import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    
    // Use the robust Next.js API to delete the cookie
    response.cookies.delete('gsc_token');
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during logout.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}