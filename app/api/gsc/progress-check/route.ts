import { google, searchconsole_v1 } from 'googleapis';
import { NextRequest } from 'next/server';
import { parse } from 'cookie';
import { Report, GscDataRow } from '../../../../types';
import { progressAnalysisFlow } from '../../../../genkit/flows/interlinkFlow';

export const dynamic = 'force-dynamic';

async function fetchLatestGscData(token: string, siteUrl: string): Promise<GscDataRow[]> {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
    );
    oauth2Client.setCredentials(JSON.parse(token));

    const searchconsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client,
    });
    
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
    // Ensure the structure matches GscDataRow, as GSC API can return different shapes
    return (res.data.rows || []).map(row => ({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
    }));
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const cookies = cookieHeader ? parse(cookieHeader) : {};
    const token = cookies.gsc_token;
    if (!token) {
        return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }
      
    const { previousReport } = await req.json() as { previousReport: Report };
    if (!previousReport || !previousReport.site) {
        return Response.json({ error: 'Il report precedente è necessario per il confronto.', details: 'previousReport is required.' }, { status: 400 });
    }

    // Use the specific GSC property URL if available, otherwise fallback to the site URL. This is crucial for sc-domain properties.
    const siteToQuery = previousReport.gscSiteUrl || previousReport.site;

    const newGscData = await fetchLatestGscData(token, siteToQuery);

    if (newGscData.length === 0) {
      return Response.json({ error: 'Impossibile recuperare nuovi dati da GSC.', details: 'Could not retrieve fresh GSC data for comparison.' }, { status: 500 });
    }

    const progressReport = await progressAnalysisFlow({
        previousReport,
        newGscData,
    });

    return Response.json(progressReport);

  } catch (error: any) {
    console.error('API Error in /api/gsc/progress-check:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
     if (error.response?.status === 401) {
        return Response.json({ error: 'Il token di autenticazione non è valido o è scaduto.', details: 'Authentication token is invalid or expired.' }, { status: 401 });
    }
    return Response.json({ error: 'Analisi dei progressi fallita.', details: errorMessage }, { status: 500 });
  }
}
