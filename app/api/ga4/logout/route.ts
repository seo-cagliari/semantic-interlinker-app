
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'GA4 Logged out successfully.' });
    
    response.cookies.delete('ga4_token');
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during GA4 logout.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
