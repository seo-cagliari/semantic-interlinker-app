import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { setCookie } from 'nookies';

export const runtime = 'nodejs'; // Force Node.js runtime to access secret env vars

const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const OAUTH2_REDIRECT_URI = process.env.NEXT_PUBLIC_GSC_REDIRECT_URI;

export async function POST(req: NextRequest) {
    if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET || !OAUTH2_REDIRECT_URI) {
        console.error("GSC credentials missing in exchange-token route");
        return Response.json({ error: 'Google OAuth credentials are not configured on the server.' }, { status: 500 });
    }

    try {
        const { code } = await req.json();

        if (typeof code !== 'string') {
            return Response.json({ error: 'Invalid authorization code provided.' }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2(
            OAUTH2_CLIENT_ID,
            OAUTH2_CLIENT_SECRET,
            OAUTH2_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        const response = Response.json({ success: true });

        setCookie({ res: response }, 'gsc_token', JSON.stringify(tokens), {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;

    } catch (error) {
        console.error('Error exchanging authorization code for token:', error);
        return Response.json({ error: 'Failed to authenticate with Google.' }, { status: 500 });
    }
}
