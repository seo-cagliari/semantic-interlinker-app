import { google } from 'googleapis';

export const runtime = 'nodejs';

const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// This should be the full URL of your callback route
const OAUTH2_REDIRECT_URI = process.env.NEXT_PUBLIC_GSC_REDIRECT_URI; 

export async function GET() {
  if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET || !OAUTH2_REDIRECT_URI) {
    return Response.json({ error: 'Google OAuth credentials are not configured.' }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    OAUTH2_REDIRECT_URI
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
}