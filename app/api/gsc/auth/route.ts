
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

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
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri 
    );

    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
    });
    
    // Redirect directly to Google's authentication page using NextResponse for robustness
    return NextResponse.redirect(authorizationUrl);
  
  } catch(error) {
     const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
     console.error('Auth Error:', errorMessage);
     return NextResponse.json({ error: "Impossibile generare l'URL di autenticazione.", details: errorMessage }, { status: 500 });
  }
}
