import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Force Node.js runtime to access secret env vars

export async function POST(req: NextRequest) {
    const missingVars = [];
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
    if (!process.env.NEXT_PUBLIC_GSC_REDIRECT_URI) missingVars.push('NEXT_PUBLIC_GSC_REDIRECT_URI');

    if (missingVars.length > 0) {
        const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}. Please configure them in your hosting provider's settings (e.g., Vercel).`;
        console.error("GSC credentials missing in exchange-token route:", errorMsg);
        return NextResponse.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
    }

    try {
        const { code } = await req.json();

        if (typeof code !== 'string') {
            return NextResponse.json({ error: 'Invalid authorization code provided.' }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.NEXT_PUBLIC_GSC_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        const response = NextResponse.json({ success: true });

        // Correctly set the cookie using NextResponse
        response.cookies.set('gsc_token', JSON.stringify(tokens), {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;

    } catch (error) {
        console.error('Error exchanging authorization code for token:', error);
        return NextResponse.json({ error: 'Failed to authenticate with Google.', details: 'The provided authorization code might be invalid or expired, or there could be a mismatch in the OAuth client configuration (e.g., redirect URI).' }, { status: 500 });
    }
}