
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Ga4Property } from '../../../../types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const missingVars = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

  if (missingVars.length > 0) {
    const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}.`;
    console.error('GA4 Properties Error:', errorMsg);
    return NextResponse.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
  }

  const tokenCookie = req.cookies.get('ga4_token');
  const token = tokenCookie?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated with GA4.' }, { status: 401 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(JSON.parse(token));

    const admin = google.analyticsadmin({
      version: 'v1beta',
      auth: oauth2Client,
    });

    const res = await admin.accountSummaries.list({ pageSize: 200 });
    const accountSummaries = res.data.accountSummaries || [];

    const properties: Ga4Property[] = [];
    accountSummaries.forEach(account => {
        (account.propertySummaries || []).forEach(prop => {
            properties.push({
                name: prop.property || '',
                displayName: `${account.displayName} - ${prop.displayName}` || '',
            });
        });
    });
    
    return NextResponse.json(properties);

  } catch (error: any) {
    console.error('Failed to fetch GA4 properties:', error);
    if (error.response?.status === 401 || (error.message && error.message.includes('invalid_grant'))) {
        const response = NextResponse.json({ error: 'GA4 authentication token is invalid or expired.' }, { status: 401 });
        response.cookies.delete('ga4_token');
        return response;
    }
    return NextResponse.json({ error: 'Failed to fetch properties from Google Analytics.' }, { status: 500 });
  }
}
