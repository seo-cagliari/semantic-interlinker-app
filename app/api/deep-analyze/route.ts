import { deepAnalysisFlow } from '../../../genkit/flows/interlinkFlow';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pageUrl, allSiteUrls } = body;

    if (!pageUrl || !allSiteUrls) {
      return Response.json({ error: 'pageUrl and allSiteUrls are required.' }, { status: 400 });
    }

    const report = await deepAnalysisFlow({ pageUrl, allSiteUrls });

    return Response.json(report);

  } catch (error) {
    console.error('API Error in /api/deep-analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    
    return Response.json({ error: 'Failed to perform deep analysis.', details: errorMessage }, { status: 500 });
  }
}