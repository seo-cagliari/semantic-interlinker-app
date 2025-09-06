import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

const renderErrorPage = (title: string, message: string, rawError?: any, redirectUri?: string) => {
  let specificDiagnosis = '';
  
  if (rawError?.error === 'redirect_uri_mismatch' && redirectUri) {
    specificDiagnosis = `
        <h3>Diagnosi Specifica: <code>redirect_uri_mismatch</code></h3>
        <p>Google sta rifiutando la richiesta perché l'URI di reindirizzamento inviato dalla nostra applicazione non è presente nell'elenco degli URI autorizzati nella tua Google Cloud Console.</p>
        <p class="azione"><b>AZIONE RICHIESTA:</b></p>
        <ol>
            <li>Copia il seguente URI. È l'indirizzo esatto e garantito che la nostra app sta usando in questo momento:</li>
            <li class="code-box"><code>${redirectUri}</code></li>
            <li>Vai alla tua <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">pagina delle credenziali di Google Cloud</a>.</li>
            <li>Seleziona il tuo progetto e clicca sul nome del tuo <b>ID client OAuth 2.0</b>.</li>
            <li>Nella sezione "URI di reindirizzamento autorizzati", clicca su "AGGIUNGI URI".</li>
            <li>Incolla l'URI che hai copiato.</li>
            <li>Salva le modifiche e prova a ricollegarti.</li>
        </ol>
        <p class="nota"><b>Nota:</b> Devi aggiungere questo URI per ogni ambiente che usi (es. localhost, produzione, URL di anteprima di Vercel).</p>
    `;
  } else if (rawError && Object.keys(rawError).length > 0) {
     specificDiagnosis = `<h3>Dati di Errore Grezzi da Google</h3>
       <p>Questa è la risposta esatta ricevuta dal server di Google. La causa dell'errore si trova qui.</p>
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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: #f8fafc; color: #1e293b; padding: 1rem; }
        .container { max-width: 800px; margin: 2rem auto; background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; text-align: left; }
        h1 { color: #b91c1c; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; }
        h3 { margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; font-size: 1.1rem;}
        p { margin-bottom: 1rem; }
        ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        li { margin-bottom: 0.5rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #475569; user-select: all; word-break: break-all; }
        pre { background-color: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap; word-break: break-all; }
        .azione { font-weight: 600; color: #0f172a; }
        .code-box { list-style: none; background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; margin: 0.5rem 0; }
        .nota { font-size: 0.875rem; color: #475569; border-left: 3px solid #64748b; padding-left: 1rem; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
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
      status: 400,
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
    console.error('OAuth State Error (GA4):', errorMessage);
    return renderErrorPage('Errore di Sicurezza GA4', `Verifica dello stato di OAuth fallita. La richiesta non può essere considerata attendibile. Dettagli: <code>${errorMessage}</code>`);
  }

  if (error) {
    console.error('Google OAuth Error (GA4):', error);
    return renderErrorPage('Errore di Autenticazione GA4', `Google ha restituito un errore: <code>${error}</code>`);
  }
  
  if (!code) {
    return renderErrorPage('Errore di Autenticazione GA4', 'Il codice di autorizzazione di Google non è stato trovato nella richiesta.');
  }
  
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMessage = `Errore di configurazione del server: Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>.`;
    console.error('GA4 Callback Error:', errorMessage);
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
    const message = `<p>Si è verificato un errore durante la comunicazione con i server di Google per scambiare il codice di autorizzazione con un token di accesso GA4.</p>`;
    
    return renderErrorPage(
        'Errore di Autenticazione GA4 (Configurazione Guidata)', 
        message,
        errorResponse,
        redirectUri
    );
  }
}
