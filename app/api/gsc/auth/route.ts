import { google } from 'googleapis';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.NEXT_PUBLIC_GSC_REDIRECT_URI) missingVars.push('NEXT_PUBLIC_GSC_REDIRECT_URI');

  if (missingVars.length > 0) {
    const errorMsg = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: ${missingVars.join(', ')}. Per favore, configurale nelle impostazioni del tuo provider di hosting (es. Vercel).`;
    const url = new URL(req.nextUrl.origin); // Get base URL
    url.searchParams.set('error', errorMsg);
    return Response.redirect(url);
  }
  
  const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const OAUTH2_REDIRECT_URI = process.env.NEXT_PUBLIC_GSC_REDIRECT_URI;

  const oauth2Client = new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    OAUTH2_REDIRECT_URI
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
