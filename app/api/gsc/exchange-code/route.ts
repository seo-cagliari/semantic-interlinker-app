import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

/**
 * Determines the redirect URI in a robust way. Must be identical to the one in /api/gsc/auth.
 */
const getRedirectUri = (req: NextRequest): string => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/`;
  }
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host');
  if (host) {
    return `${protocol}://${host}/`;
  }
  return '';
};

export async function POST(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  const redirectUri = getRedirectUri(req);
  
  if (missingVars.length > 0 || !redirectUri) {
    let errorMsg = `Errore di configurazione del server. `;
    if(missingVars.length > 0) errorMsg += `Mancano le seguenti variabili: ${missingVars.join(', ')}. `;
    if(!redirectUri) errorMsg += `Impossibile determinare il Redirect URI. Imposta la variabile d'ambiente GOOGLE_REDIRECT_URI.`;
    return Response.json({ error: 'Server configuration error', details: errorMsg }, { status: 500 });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      return Response.json({ error: 'Authorization code is missing.' }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Secure, http-only cookie
    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Set-Cookie': cookie },
    });

  } catch (error: any) {
    console.error('Error exchanging code for token:', error.message);
    // Google's error for mismatch is often 'invalid_grant'
    const details = error.response?.data?.error_description || error.message || 'An unknown error occurred.';
    return Response.json({ 
      error: 'Failed to exchange authorization code for token.', 
      details: `Google API Error: ${details}. Questo errore è spesso causato da un 'redirect_uri_mismatch'. Assicurati che il tuo GOOGLE_REDIRECT_URI (${redirectUri}) sia identico a quello configurato nella tua Google Cloud Console.`
    }, { status: 500 });
  }
}
