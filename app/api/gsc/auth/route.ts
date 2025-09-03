import { google } from 'googleapis';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Determina l'URL di base dell'applicazione in modo affidabile.
 * L'ordine di priorità è:
 * 1. Variabile d'ambiente VERCEL_URL (per i deploy su Vercel).
 * 2. Header della richiesta (per lo sviluppo locale e altre piattaforme).
 */
const getBaseUrl = (req: NextRequest): string => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host');
  return `${protocol}://${host}`;
};

const renderErrorPage = (title: string, message: string) => {
  return new Response(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
        .container { text-align: center; background-color: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); max-width: 600px; }
        h1 { color: #b91c1c; }
        p { margin-bottom: 1rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>`,
    {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    }
  );
};

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
  
  if (missingVars.length > 0) {
    return renderErrorPage(
      'Errore di Configurazione del Server',
      `Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>. Per favore, configurale nelle impostazioni del tuo provider di hosting (es. Vercel) per procedere.`
    );
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/gsc/callback`;
  
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