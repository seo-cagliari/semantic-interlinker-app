import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Helper function to generate an HTML response
const createHtmlResponse = (title: string, message: string, script?: string) => {
    return `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; text-align: center; padding: 1rem; }
                .container { background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); max-width: 500px; }
                h1 { font-size: 1.25rem; font-weight: 600; }
                p { margin-top: 0.5rem; color: #64748b; }
                .error { color: #dc2626; background-color: #fee2e2; padding: 0.75rem; border-radius: 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                <p>${message}</p>
            </div>
            ${script ? `<script>${script}</script>` : ''}
        </body>
        </html>
    `;
};


export async function GET(req: NextRequest) {
    // 1. Check for environment variables FIRST. This is the most likely point of failure.
    const missingVars = [];
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
    if (!process.env.NEXT_PUBLIC_GSC_REDIRECT_URI) missingVars.push('NEXT_PUBLIC_GSC_REDIRECT_URI');

    if (missingVars.length > 0) {
        const errorMsg = `Errore critico di configurazione del server. Le seguenti variabili d'ambiente mancano: <strong>${missingVars.join(', ')}</strong>. È necessario configurarle nelle impostazioni del progetto sul provider di hosting (es. Vercel) affinché l'autenticazione funzioni.`;
        const html = createHtmlResponse('Configurazione Incompleta', errorMsg);
        return new NextResponse(html, {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
        });
    }

    // 2. Get the authorization code from the URL
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
        const html = createHtmlResponse('Autenticazione Fallita', 'Nessun codice di autorizzazione ricevuto da Google. Per favore, riprova.');
        return new NextResponse(html, {
            status: 400,
            headers: { 'Content-Type': 'text/html' },
        });
    }

    // 3. Exchange the code for a token (logic from the old exchange-token route)
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.NEXT_PUBLIC_GSC_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        
        // 4. If successful, set the cookie and return a success page that closes itself.
        const successHtml = createHtmlResponse(
            'Autenticazione Riuscita!',
            'Le credenziali sono state verificate con successo. Questa finestra si chiuderà automaticamente.',
            'setTimeout(() => window.close(), 1500);'
        );

        const response = new NextResponse(successHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });
        
        response.cookies.set('gsc_token', JSON.stringify(tokens), {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return response;

    } catch (error) {
        console.error('Error exchanging authorization code for token in callback:', error);
        const errorDetails = error instanceof Error ? error.message : 'Dettagli non disponibili';
        const userFriendlyError = `Si è verificato un errore durante la comunicazione con i server di Google. Ciò potrebbe essere dovuto a un codice di autorizzazione scaduto o non valido. Dettagli tecnici: ${errorDetails}`;
        const errorHtml = createHtmlResponse('Autenticazione Fallita', userFriendlyError);
        
        return new NextResponse(errorHtml, {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
        });
    }
}