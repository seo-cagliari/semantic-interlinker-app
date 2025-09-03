import { NextRequest, NextResponse } from 'next/server';

// This route's only job is to catch the redirect from Google and pass the code
// to a client-side page that can then make a clean API request.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    // Redirect to a failure page or the main page with an error
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('error', 'Autorizzazione Google fallita. Nessun codice di autorizzazione ricevuto.');
    return NextResponse.redirect(homeUrl);
  }
  
  // Redirect to a dedicated page on the frontend to complete the auth flow
  const completeAuthUrl = new URL('/gsc-auth-complete', req.url);
  completeAuthUrl.searchParams.set('code', code);
  
  return NextResponse.redirect(completeAuthUrl);
}
