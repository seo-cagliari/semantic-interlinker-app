import { google } from 'googleapis';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Determines the redirect URI in a robust way.
 * Priority:
 * 1. GOOGLE_REDIRECT_URI environment variable (most reliable).
 * 2. VERCEL_URL environment variable (for Vercel deployments).
 * 3. Request headers (fallback for local dev / other platforms).
 */
const getRedirectUri = (req: NextRequest): string => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (process.env.VERCEL_URL) {
    // Vercel URL doesn't include the protocol, so we add it.
    return `https://${process.env.VERCEL_URL}/`;
  }
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host');
  if (host) {
    return `${protocol}://${host}/`;
  }
  return ''; // Cannot determine URI
};

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  const redirectUri = getRedirectUri(req);
  const rootUrl = redirectUri.endsWith('/') ? redirectUri.slice(0, -1) : redirectUri;

  if (missingVars.length > 0) {
    const errorMsg = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: ${missingVars.join(', ')}. Per favore, configurale nelle impostazioni del tuo provider di hosting (es. Vercel).`;
    const url = new URL(rootUrl || req.url);
    url.pathname = '/';
    url.searchParams.set('error', errorMsg);
    return Response.redirect(url);
  }

  if (!redirectUri) {
     const errorMsg = `Errore critico di configurazione: Impossibile determinare il Redirect URI. Per risolvere, imposta la variabile d'ambiente GOOGLE_REDIRECT_URI con l'URL base della tua applicazione (es. https://tuo-dominio.vercel.app/).`;
     const url = new URL(req.url); // Can't redirect to root if we don't know it
     url.pathname = '/';
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
