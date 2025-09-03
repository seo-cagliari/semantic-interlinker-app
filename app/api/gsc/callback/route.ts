import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

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
  if (!process.env.APP_BASE_URL) missingVars.push('APP_BASE_URL');

  if (missingVars.length > 0) {
    const errorMessage = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>.`;
    console.error('Callback Error:', errorMessage);
    return renderErrorPage('Errore di Configurazione del Server', errorMessage);
  }

  try {
    const baseUrl = process.env.APP_BASE_URL;
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
    
    // Redirect back to the STABLE production homepage
    const response = Response.redirect(baseUrl, 302);
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err.message);
    const appBaseUrl = process.env.APP_BASE_URL || '[NON IMPOSTATA]';
    return renderErrorPage(
        'Errore di Autenticazione', 
        `Impossibile scambiare il codice di autorizzazione. Questo è quasi sempre causato da un 'redirect_uri_mismatch'.
        <br/><br/><b>VERIFICA QUESTI PUNTI:</b>
        <br/>1. La variabile d'ambiente <code>APP_BASE_URL</code> in Vercel deve essere: <code>https://semantic-interlinker-app.vercel.app</code>
        <br/>2. L'URI di reindirizzamento autorizzato in Google Cloud Console deve essere: <code>https://semantic-interlinker-app.vercel.app/api/gsc/callback</code>`
    );
  }
}