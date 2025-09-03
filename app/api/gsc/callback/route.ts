import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

// Helper function to get the base URL, must be identical to the one in auth route
function getBaseUrl(req: NextRequest): string {
    // Vercel system env var for the deployment's URL
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback for local development or other environments
    const host = req.headers.get('host');
    // For local dev, req.headers.get('host') is 'localhost:3000'
    // For production, it's the domain. We assume https for non-local.
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    if (!host) {
        throw new Error("Could not determine the host from the request headers.");
    }
    return `${protocol}://${host}`;
}

const renderErrorPage = (title: string, message: string) => {
  return new Response(
    `<!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.6; background-color: #f8fafc; color: #1e293b; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; text-align: left; }
        h1 { color: #b91c1c; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
        p { margin-bottom: 1rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #475569; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span style="font-size: 1.5rem;">🚨</span> ${title}</h1>
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
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('Google OAuth Error:', error);
    return renderErrorPage('Errore di Autenticazione', `Google ha restituito un errore: ${error}`);
  }
  
  if (!code) {
    return renderErrorPage('Errore di Autenticazione', 'Il codice di autorizzazione di Google non è stato trovato nella richiesta.');
  }
  
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMessage = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>.`;
    console.error('Callback Error:', errorMessage);
    return renderErrorPage('Errore di Configurazione del Server', errorMessage);
  }

  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/gsc/callback`;
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    const url = new URL(baseUrl);
    const domain = url.hostname;

    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      path: '/',
      domain: domain
    });
    
    // Redirect back to the homepage of the specific deployment (preview or prod)
    const response = Response.redirect(baseUrl, 302);
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (err: any) {
    const baseUrl = getBaseUrl(req);
    const debugUrl = `${baseUrl}/api/debug-env`;

    console.error('Failed to exchange code for token:', err.message);
    return renderErrorPage(
        'Errore di Autenticazione', 
        `Impossibile scambiare il codice di autorizzazione. Questo è quasi sempre causato da un 'redirect_uri_mismatch'.
        <br/><br/><b>AZIONE RICHIESTA:</b>
        <br/>1. Visita la pagina di debug per questo deploy per trovare l'URI corretto: <a href="${debugUrl}" target="_blank">${debugUrl}</a>
        <br/>2. Copia l'URI che trovi in quella pagina.
        <br/>3. Incolla l'URI nella lista degli "URI di reindirizzamento autorizzati" nella tua Google Cloud Console.`
    );
  }
}
