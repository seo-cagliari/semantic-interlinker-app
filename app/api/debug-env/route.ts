import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Helper function to get the base URL, must be identical to the one in auth/callback routes
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
        // This should not happen in a real request context
        return 'http://localhost:3000';
    }
    return `${protocol}://${host}`;
}


export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/gsc/callback`;
  
  const vercelUrl = process.env.VERCEL_URL || '(Non impostata - probabilmente in esecuzione locale)';
  const nodeEnv = process.env.NODE_ENV || '(Non impostata)';
  const hostHeader = req.headers.get('host') || '(Nessun header host)';

  return new Response(
    `<!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Debug Configurazione Ambiente</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.6; background-color: #f8fafc; color: #1e293b; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        h1 { color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem; }
        h2 { color: #334155; margin-top: 2rem; }
        p { margin-bottom: 1rem; }
        code { background-color: #e2e8f0; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #475569; }
        .highlight { background-color: #fef9c3; padding: 1rem; border-radius: 0.5rem; border: 1px solid #fde047; }
        .highlight code { background-color: #fef08a; color: #713f12; font-weight: 600; font-size: 1.1rem; }
        li { margin-bottom: 0.5rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span style="font-size: 2rem;">🛠️</span> Diagnostica Ambiente</h1>
        <p>Questa pagina mostra l'URI di reindirizzamento esatto che questo specifico deploy dell'applicazione sta usando per l'autenticazione Google.</p>
        
        <div class="highlight">
          <h2>URI di Reindirizzamento Calcolato</h2>
          <p>Copia questo valore e incollalo nella lista degli "URI di reindirizzamento autorizzati" nella tua Google Cloud Console.</p>
          <code>${redirectUri}</code>
        </div>

        <h2>Dettagli Calcolo</h2>
        <ul>
          <li><strong>URL Base Rilevato:</strong> <code>${baseUrl}</code></li>
          <li><strong>Endpoint di Callback:</strong> <code>/api/gsc/callback</code></li>
        </ul>
        
        <h2>Variabili di Ambiente Utilizzate</h2>
        <ul>
          <li><code>process.env.VERCEL_URL</code>: <code>${vercelUrl}</code></li>
          <li><code>process.env.NODE_ENV</code>: <code>${nodeEnv}</code></li>
          <li><strong>Header 'host' della Richiesta:</strong> <code>${hostHeader}</code></li>
        </ul>
        <p>La logica per determinare l'URL base dà priorità a <code>VERCEL_URL</code> e poi si basa sull'header 'host'. Questo assicura che funzioni sia su Vercel (produzione e anteprima) che in locale.</p>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }
  );
}
