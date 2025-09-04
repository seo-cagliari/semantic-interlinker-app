import { google } from 'googleapis';
import { NextRequest } from 'next/server';
import { parse } from 'cookie';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}. Please configure them in your hosting provider's settings (e.g., Vercel).`;
    console.error('GSC Sites Error:', errorMsg);
    return Response.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
  }

  const cookieHeader = req.headers.get('cookie');
  const cookies = cookieHeader ? parse(cookieHeader) : {};
  const token = cookies.gsc_token;

  if (!token) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
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
