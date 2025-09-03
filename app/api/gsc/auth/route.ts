import { google } from 'googleapis';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
  
  // Dynamically determine the redirect URI from the request headers
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host');
  const redirectUri = `${protocol}://${host}/`;

  if (missingVars.length > 0) {
    const errorMsg = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: ${missingVars.join(', ')}. Per favore, configurale nelle impostazioni del tuo provider di hosting (es. Vercel).`;
    const url = new URL(redirectUri);
    url.searchParams.set('error', errorMsg);
    return Response.redirect(url);
  }
  
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

  return Response.redirect(authorizationUrl);
}