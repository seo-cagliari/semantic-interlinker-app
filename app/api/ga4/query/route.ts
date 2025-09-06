
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { Ga4DataRow } from '../../../../types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const missingVars = [];
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

    if (missingVars.length > 0) {
        const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}.`;
        console.error('GA4 Query Error:', errorMsg);
        return NextResponse.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
    }
    
    const { propertyId } = await req.json();
    if (!propertyId) {
        return NextResponse.json({ error: 'propertyId is required.' }, { status: 400 });
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

        const analyticsData = google.analyticsdata({
            version: 'v1beta',
            auth: oauth2Client,
        });

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const startDate = ninetyDaysAgo.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        const apiResponse = await analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'pagePath' }],
                metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }, { name: 'conversions' }],
                keepEmptyRows: false
            },
        });
        
        const rows = apiResponse.data.rows || [];

        const formattedData: Ga4DataRow[] = rows.map(row => ({
            pagePath: row.dimensionValues?.[0]?.value || '',
            sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
            totalUsers: parseInt(row.metricValues?.[1]?.value || '0', 10),
            engagementRate: parseFloat(row.metricValues?.[2]?.value || '0'),
            conversions: parseInt(row.metricValues?.[3]?.value || '0', 10),
        })).filter(d => d.pagePath && d.pagePath !== '/');

        return NextResponse.json(formattedData);

    } catch (error: any) {
        console.error('Failed to query GA4 data:', error.message);
        if (error.response?.status === 401 || (error.message && error.message.includes('invalid_grant'))) {
             const response = NextResponse.json({ error: 'GA4 authentication token is invalid or expired.' }, { status: 401 });
             response.cookies.delete('ga4_token');
             return response;
        }
        return NextResponse.json({ error: 'Failed to query data from Google Analytics.' }, { status: 500 });
    }
}