import { google, searchconsole_v1 } from 'googleapis';
import { NextRequest } from 'next/server';
import { parseCookies } from 'nookies';

export const runtime = 'nodejs';

const OAUTH2_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const OAUTH2_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(req: NextRequest) {
    if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
        return Response.json({ error: 'Google OAuth credentials are not configured.' }, { status: 500 });
    }
    
    const { siteUrl } = await req.json();
    if (!siteUrl) {
        return Response.json({ error: 'siteUrl is required.' }, { status: 400 });
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