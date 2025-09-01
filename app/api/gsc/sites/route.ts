import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { parseCookies } from 'nookies';

export const runtime = 'nodejs';

const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(req: NextRequest) {
  if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
    return Response.json({ error: 'Google OAuth credentials are not configured.' }, { status: 500 });
  }

  const cookies = parseCookies({ req });
  const token = cookies.gsc_token;

  if (!token) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      OAUTH2_CLIENT_ID,
      OAUTH2_CLIENT_SECRET
    );
    oauth2Client.setCredentials(JSON.parse(token));

    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    });

    const res = await searchconsole.sites.list({});
    
    return Response.json(res.data.siteEntry || []);

  } catch (error: any) {
    console.error('Failed to fetch GSC sites:', error);
    // If the token is expired/invalid, Google API throws an error.
    if (error.response?.status === 401) {
        return Response.json({ error: 'Authentication token is invalid or expired.' }, { status: 401 });
    }
    return Response.json({ error: 'Failed to fetch sites from Google Search Console.' }, { status: 500 });
  }
}