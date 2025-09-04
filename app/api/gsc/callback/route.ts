import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export const runtime = 'nodejs';

const renderErrorPage = (title: string, message: string, rawError?: any) => {
  const rawErrorHtml = rawError && Object.keys(rawError).length > 0
    ? `<h3>Dati di Errore Grezzi da Google</h3>
       <p>Questa è la risposta esatta ricevuta dal server di Google, senza filtri. La vera causa dell'errore si trova qui.</p>
       <pre><code>${JSON.stringify(rawError, null, 2)}</code></pre>` 
    : '';

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
        ${rawErrorHtml}
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
    return renderErrorPage('Errore di Autenticazione', `Google ha restituito un errore: <code>${error}</code>`);
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

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    const errorMessage = `Errore di configurazione del server: La variabile d'ambiente APP_BASE_URL non è definita.`;
    return renderErrorPage('Errore di Configurazione del Server', errorMessage);
  }
  const redirectUri = `${baseUrl}/api/gsc/callback`;
  let tokens;

  try {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorPayload;
        try {
            errorPayload = JSON.parse(errorText);
        } catch (e) {
            errorPayload = { 
                error: 'non_json_response', 
                error_description: 'La risposta di errore da Google non era un JSON valido.',
                raw_response: errorText 
            };
        }
        throw errorPayload;
    }

    tokens = await tokenResponse.json();

    const cookie = serialize('gsc_token', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
      path: '/',
      sameSite: 'lax',
    });
    
    // FIX: Construct the Response object with all headers at once to avoid immutable errors.
    return new Response(null, {
      status: 302, // Found (Redirect)
      headers: {
        'Location': baseUrl,
        'Set-Cookie': cookie,
      },
    });

  } catch (err: any) {
    console.error('Raw error during Google Token exchange:', err);
    
    let message = `<p>Si è verificato un errore durante la comunicazione con i server di Google per scambiare il codice di autorizzazione con un token di accesso.</p>
                     <p>Questo di solito indica un problema di configurazione nel tuo progetto Google Cloud. Analizza la risposta grezza qui sotto per identificare la causa del problema.</p>`;

    if (err.error === 'redirect_uri_mismatch') {
        message += `<h3>Diagnosi Specifica: <code>redirect_uri_mismatch</code></h3>
                    <p>Google sta rifiutando la richiesta perché l'URI di reindirizzamento non corrisponde a quello autorizzato nella tua Google Cloud Console.</p>
                    <p><b>VERIFICA QUESTI VALORI:</b></p>
                    <ul>
                        <li><b>URI inviato da questa applicazione:</b> <code>${redirectUri}</code></li>
                        <li>Assicurati che questo esatto valore sia presente nell'elenco degli "URI di reindirizzamento autorizzati" per il tuo ID client OAuth 2.0. Controlla la presenza di <code>http</code> vs <code>https</code>, barre finali (<code>/</code>), e sottodomini (<code>www.</code>).</li>
                    </ul>`;
    } else if (err.error === 'invalid_client') {
        message += `<h3>Diagnosi Specifica: <code>invalid_client</code></h3>
                    <p>L'autenticazione del client è fallita. Questo quasi sempre significa che il <b>Client Secret</b> non è corretto.</p>
                    <p><b>AZIONE RICHIESTA:</b></p>
                    <ul>
                        <li>Vai alla tua <a href="https://console.cloud.google.com/apis/credentials" target="_blank">pagina delle credenziali di Google Cloud</a>.</li>
                        <li>Verifica che la variabile d'ambiente <code>GOOGLE_CLIENT_SECRET</code> nel tuo hosting corrisponda esattamente al valore mostrato per il tuo ID client OAuth.</li>
                        <li>Se hai rigenerato il secret di recente, assicurati di aver aggiornato la variabile d'ambiente.</li>
                    </ul>`;
    } else {
       message += `<p><b>Altre cause comuni:</b></p>
                     <ul>
                        <li><b><code>invalid_grant</code>:</b> Il codice di autorizzazione (<code>code</code>) è scaduto o non valido. Prova a ricollegarti.</li>
                     </ul>`;
    }

    // Create a serializable object from the error to ensure it's displayed correctly.
    const serializableError = {
        error: err.error,
        error_description: err.error_description,
        error_uri: err.error_uri,
        raw_response: err.raw_response,
        name: err.name,
        message: err.message,
    };

    // Filter out undefined/null properties for a cleaner display
    const finalErrorObject = Object.entries(serializableError).reduce((acc, [key, value]) => {
        if (value) {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);

    return renderErrorPage(
        'Errore di Autenticazione (Diagnosi Avanzata)', 
        message,
        finalErrorObject
    );
  }
}