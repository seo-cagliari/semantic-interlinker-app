import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

const renderErrorPage = (title: string, message: string, rawError?: any, redirectUri?: string) => {
  let specificDiagnosis = '';

  if (rawError?.error === 'redirect_uri_mismatch' && redirectUri) {
     specificDiagnosis = `<h3>Diagnosi Specifica: <code>redirect_uri_mismatch</code></h3>
                    <p>Google sta rifiutando la richiesta perché l'URI di reindirizzamento non corrisponde a quello autorizzato nella tua Google Cloud Console.</p>
                    <p><b>AZIONE RICHIESTA:</b></p>
                    <ul>
                        <li><b>URI garantito inviato da questa applicazione (verificato tramite 'state'):</b> <code>${redirectUri}</code></li>
                        <li>Copia il valore qui sopra e assicurati che sia presente nell'elenco degli "URI di reindirizzamento autorizzati" per il tuo ID client OAuth 2.0. Controlla la presenza di <code>http</code> vs <code>https</code>, barre finali (<code>/</code>), e sottodomini (<code>www.</code>).</li>
                    </ul>`;
  } else if (rawError && Object.keys(rawError).length > 0) {
    specificDiagnosis = `<h3>Dati di Errore Grezzi da Google</h3>
       <p>Questa è la risposta esatta ricevuta dal server di Google, senza filtri. La vera causa dell'errore si trova qui.</p>
       <pre><code>${JSON.stringify(rawError, null, 2)}</code></pre>`;
  }

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
        h3 { margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;}
        p { margin-bottom: 1rem; }
        ul { margin-left: 1.5rem; margin-bottom: 1rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #475569; user-select: all; word-break: break-all; }
        pre { background-color: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span style="font-size: 1.5rem;">🚨</span> ${title}</h1>
        <div>${message}</div>
        ${specificDiagnosis}
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
  const state = searchParams.get('state');

  let redirectUri: string;
  try {
    if (!state) throw new Error("Il parametro 'state' di OAuth è mancante. Impossibile verificare la richiesta.");
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    if (!decodedState.redirectUri) throw new Error("Lo 'state' di OAuth non contiene il redirectUri richiesto.");
    redirectUri = decodedState.redirectUri;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Errore sconosciuto durante la decodifica dello state.";
    console.error('OAuth State Error:', errorMessage);
    return renderErrorPage('Errore di Sicurezza', `Verifica dello stato di OAuth fallita. La richiesta non può essere considerata attendibile. Dettagli: <code>${errorMessage}</code>`);
  }

  if (error) {
    console.error('Google OAuth Error:', error);
    return renderErrorPage('Errore di Autenticazione', `Google ha restituito un errore: <code>${error}</code>`);
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
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const response = NextResponse.redirect(new URL('/dashboard', req.url));
    
    response.cookies.set('ga4_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
    });
    
    return response;

  } catch (err: any) {
    console.error('Raw error during Google Token exchange (GA4):', err);
    
    const errorResponse = err.response?.data || {};
    const message = `<p>Si è verificato un errore durante la comunicazione con i server di Google per scambiare il codice di autorizzazione con un token di accesso.</p>`;

    return renderErrorPage(
        'Errore di Autenticazione GA4 (Diagnosi Avanzata)', 
        message,
        errorResponse,
        redirectUri
    );
  }
}