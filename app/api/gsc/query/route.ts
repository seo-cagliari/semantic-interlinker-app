import { google, searchconsole_v1 } from 'googleapis';
import { NextRequest } from 'next/server';
import { parse } from 'cookie';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const missingVars = [];
    if (!process.env.GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');

    if (missingVars.length > 0) {
        const errorMsg = `The following server environment variables are not configured: ${missingVars.join(', ')}. Please configure them in your hosting provider's settings (e.g., Vercel).`;
        console.error('GSC Query Error:', errorMsg);
        return Response.json({ error: 'Server configuration error.', details: errorMsg }, { status: 500 });
    }
    
    const { siteUrl } = await req.json();
    if (!siteUrl) {
        return Response.json({ error: 'siteUrl is required.' }, { status: 400 });
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

        // Get the date 90 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        const formattedStartDate = startDate.toISOString().split('T')[0];
        
        const request: searchconsole_v1.Params$Resource$Searchanalytics$Query = {
            siteUrl,
            requestBody: {
                startDate: formattedStartDate,
                endDate: new Date().toISOString().split('T')[0],
                dimensions: ['query', 'page'],
                rowLimit: 5000,
                startRow: 0,
            }
        };

        const res = await searchconsole.searchanalytics.query(request);
        
        return Response.json(res.data.rows || []);

    } catch (error: any) {
        console.error('Failed to query GSC data:', error.message);
        if (error.response?.status === 401) {
            return Response.json({ error: 'Authentication token is invalid or expired.' }, { status: 401 });
        }
        return Response.json({ error: 'Failed to query data from Google Search Console.' }, { status: 500 });
    }
}