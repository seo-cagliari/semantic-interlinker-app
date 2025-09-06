import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMsg = `Le seguenti variabili d'ambiente del server non sono configurate: ${missingVars.join(', ')}.`;
    console.error('Auth Error:', errorMsg);
    return NextResponse.json({ error: 'Errore di Configurazione del Server', details: errorMsg }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const redirectUri = `${url.origin}/api/gsc/callback`;

    // **Stateful Handshake Implementation**
    // 1. Create a state object containing the exact redirect URI.
    const state = { redirectUri };
    // 2. Encode the state object to be safely passed in the URL.
    const encodedState = Buffer.from(JSON.stringify(state)).toString('base64');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri // This is still needed for the initial client setup
    );

    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      state: encodedState, // 3. Pass the encoded state to Google.
      prompt: 'consent', // Force a clean consent screen every time
    });
    
    return NextResponse.redirect(authorizationUrl);
  
  } catch(error) {
     const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
     console.error('Auth Error:', errorMessage);
     return NextResponse.json({ error: "Impossibile generare l'URL di autenticazione.", details: errorMessage }, { status: 500 });
  }
}