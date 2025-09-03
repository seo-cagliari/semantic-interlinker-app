import { google } from 'googleapis';
import { NextRequest } from 'next/server';

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
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.APP_BASE_URL) missingVars.push('APP_BASE_URL');

  if (missingVars.length > 0) {
    const errorMessage = `Le seguenti variabili d'ambiente mancano: <code>${missingVars.join(', ')}</code>. Per favore, configurale nelle impostazioni del tuo provider di hosting (es. Vercel) per procedere.`;
    return renderErrorPage(
      'Errore di Configurazione del Server',
      errorMessage
    );
  }

  try {
    const baseUrl = process.env.APP_BASE_URL;
    if (!baseUrl) {
      // This check satisfies TypeScript and adds robustness.
      throw new Error("APP_BASE_URL is not defined in the environment.");
    }

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
  
  } catch(error) {
     const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
     return renderErrorPage('Errore di Autenticazione', `Impossibile generare l'URL di autenticazione. Dettagli: ${errorMessage}`);
  }
}