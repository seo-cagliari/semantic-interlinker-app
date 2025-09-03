import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

const renderPage = (status: 'success' | 'error', message?: string, baseUrl?: string) => {
  const title = status === 'success' ? 'Autenticazione Riuscita' : 'Errore di Autenticazione';
  const script = status === 'success'
    ? `<script>
        if (window.opener) {
          // Send an object with status and the production URL for a definitive redirect
          window.opener.postMessage({ status: 'auth_success', productionUrl: '${baseUrl}' }, '*');
        }
        // Give a bit more time for the message to be processed before closing
        setTimeout(() => window.close(), 800);
      </script>`
    : '';

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
        h1 { color: ${status === 'success' ? '#166534' : '#b91c1c'}; }
        p { margin-bottom: 1rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message || (status === 'success' ? 'Autenticazione completata con successo. Questa finestra si chiuderà automaticamente.' : 'Si è verificato un errore imprevisto.')}</p>
      </div>
      ${script}
    </body>
    </html>`,
    {
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
    return renderPage('error', `Google ha restituito un errore: ${error}`);
  }
  
  if (!code) {
    return renderPage('error', 'Il codice di autorizzazione di Google non è stato trovato nella richiesta.');
  }
  
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.APP_BASE_URL) missingVars.push('APP_BASE_URL');

  if (missingVars.length > 0) {
    let errorMessage = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>.`;
     if (missingVars.includes('APP_BASE_URL')) {
        errorMessage += `<br/><br/>La variabile <code>APP_BASE_URL</code> deve essere l'URL di produzione stabile della tua applicazione (es. <code>https://your-app.vercel.app</code>), senza lo slash finale.`;
    }
    console.error('Callback Error:', errorMessage);
    return renderPage('error', errorMessage);
  }

  // Explicit check to satisfy TypeScript's strict null checks and fix the build error
  if (!process.env.APP_BASE_URL) {
      return renderPage('error', 'Errore critico: APP_BASE_URL non è definito anche dopo il controllo. La configurazione del server è incompleta.');
  }

  const baseUrl = process.env.APP_BASE_URL;
  const redirectUri = `${baseUrl}/api/gsc/callback`;
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Extract the hostname for the cookie domain - this is now safe
    const url = new URL(baseUrl);
    const domain = url.hostname;

    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      path: '/',
      domain: domain // Set the cookie on the base domain to be available across subdomains
    });
    
    const response = renderPage('success', undefined, baseUrl);
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err.message);
    return renderPage('error', `Impossibile scambiare il codice di autorizzazione. Questo è quasi sempre causato da un 'redirect_uri_mismatch'.<br/><br/><b>VERIFICA QUESTI PUNTI:</b><br/>1. La variabile d'ambiente <code>APP_BASE_URL</code> in Vercel deve essere: <code>${baseUrl}</code><br/>2. L'URI di reindirizzamento autorizzato in Google Cloud Console deve essere: <code>${redirectUri}</code>`);
  }
}