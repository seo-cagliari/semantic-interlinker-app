import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}.`;
    console.error('GSC Sites Error:', errorMsg);
    return NextResponse.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
  }

  const tokenCookie = req.cookies.get('gsc_token');
  const token = tokenCookie?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
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
    
    return NextResponse.json(res.data.siteEntry || []);

  } catch (error: any) {
    console.error('Failed to fetch GSC sites:', error);
    if (error.response?.status === 401 || (error.message && error.message.includes('invalid_grant'))) {
        // Clear the invalid cookie and respond
        const response = NextResponse.json({ error: 'Authentication token is invalid or expired.' }, { status: 401 });
        response.cookies.delete('gsc_token');
        return response;
    }
    return NextResponse.json({ error: 'Failed to fetch sites from Google Search Console.' }, { status: 500 });
  }
}