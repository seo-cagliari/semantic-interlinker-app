import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { parseCookies, setCookie } from 'nookies';

const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const OAUTH2_REDIRECT_URI = process.env.NEXT_PUBLIC_GSC_REDIRECT_URI;

export async function GET(req: NextRequest) {
    if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET || !OAUTH2_REDIRECT_URI) {
        return Response.json({ error: 'Google OAuth credentials are not configured.' }, { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (typeof code !== 'string') {
        return Response.json({ error: 'Invalid authorization code.' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            OAUTH2_CLIENT_ID,
            OAUTH2_CLIENT_SECRET,
            OAUTH2_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        // In a real app, you'd encrypt these tokens before storing them.
        // We are setting them in a secure, httpOnly cookie.
        const response = new Response(
            `<script>window.close();</script>`, 
            { headers: { 'Content-Type': 'text/html' } }
        );

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