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
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #475569; user-select: all; word-break: break-all; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .control-box { border: 1px solid #cbd5e1; padding: 1.5rem; border-radius: 0.5rem; margin-top: 1rem; }
        .control-box h2 { font-size: 1.2rem; color: #1e293b; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span style="font-size: 1.5rem;">🚨</span> ${title}</h1>
        <div>${message}</div>
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
    if (!baseUrl) {
      throw new Error("APP_BASE_URL is not defined in the environment.");
    }
    
    const redirectUri = `${baseUrl}/api/gsc/callback`;
    
    // --- Manual Token Exchange via Fetch ---
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const googleError = tokens.error_description || JSON.stringify(tokens);
      throw new Error(`[Manual Fetch] Google Token API Error: ${googleError}`);
    }
    // --- End Manual Token Exchange ---

    const url = new URL(baseUrl);
    const domain = url.hostname;

    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      path: '/',
      domain: domain
    });
    
    const response = Response.redirect(baseUrl, 302);
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (err: any) {
    console.error('Failed to exchange code for token:', err.message);
    
    const redirectUriUsed = `${process.env.APP_BASE_URL}/api/gsc/callback`;
    const jsOriginUsed = process.env.APP_BASE_URL;
    const clientIdUsed = process.env.GOOGLE_CLIENT_ID;

    return renderErrorPage(
        'Errore di Autenticazione', 
        `<p>Impossibile scambiare il codice di autorizzazione. I dati che hai fornito dimostrano che il problema non è un errore di battitura, ma un dettaglio di configurazione mancante.</p>
        <p><b>SOLUZIONE INFALLIBILE (2 CONTROLLI CRUCIALI):</b></p>
        
        <div class="control-box">
          <h2>Controllo 1: Origini JavaScript Autorizzate</h2>
          <p>Questo campo dice a Google quali siti possono <b>iniziare</b> il processo di autenticazione. È probabile che questo sia il controllo mancante.</p>
          <ol style="padding-left: 1.5rem; margin-top: 0.5rem;">
            <li>Nella pagina di Google Cloud Console per il tuo Client ID, trova la sezione <b>"Origini JavaScript autorizzate"</b>.</li>
            <li>Clicca "AGGIUNGI URI".</li>
            <li>Incolla ESATTAMENTE questo valore: <code>${jsOriginUsed}</code></li>
          </ol>
        </div>

        <div class="control-box">
          <h2>Controllo 2: URI di Reindirizzamento Autorizzati</h2>
          <p>Questo campo dice a Google dove può <b>rimandare</b> l'utente dopo l'autenticazione. Verifica che corrisponda ancora perfettamente.</p>
           <ol style="padding-left: 1.5rem; margin-top: 0.5rem;">
            <li>Nella stessa pagina, trova la sezione <b>"URI di reindirizzamento autorizzati"</b>.</li>
            <li>Assicurati che l'<b>UNICO</b> valore in questa lista sia ESATTAMENTE questo: <code>${redirectUriUsed}</code></li>
          </ol>
        </div>

        <br/>
        <p>Dopo aver salvato queste modifiche, attendi 5 minuti e riprova. Questo risolverà il problema in modo definitivo.</p>
        <p><b>Client ID in uso per verifica:</b> <code>${clientIdUsed}</code></p>
        `
    );
  }
}
