import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

const getBaseUrl = (req: NextRequest): string => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host');
  return `${protocol}://${host}`;
};

const renderPage = (status: 'success' | 'error', message?: string) => {
  const title = status === 'success' ? 'Autenticazione Riuscita' : 'Errore di Autenticazione';
  const script = status === 'success'
    ? `<script>
        if (window.opener) {
          window.opener.postMessage('auth_success', '*');
        }
        window.close();
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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>${message || (status === 'success' ? 'Puoi chiudere questa finestra.' : 'Si è verificato un errore imprevisto.')}</p>
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

  if (missingVars.length > 0) {
    const errorMsg = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: ${missingVars.join(', ')}.`;
    console.error('Callback Error:', errorMsg);
    return renderPage('error', errorMsg);
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/gsc/callback`;
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      path: '/',
    });
    
    const response = renderPage('success');
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err.message);
    return renderPage('error', `Impossibile scambiare il codice di autorizzazione. Dettagli: ${err.message}`);
  }
}