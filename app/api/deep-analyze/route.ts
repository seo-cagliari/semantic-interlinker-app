import { deepAnalysisFlow } from '../../../genkit/flows/interlinkFlow';
import { PageDiagnostic, GscDataRow, StrategicContext, ThematicCluster } from '../../../types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pageUrl, pageDiagnostics, gscData, strategicContext, thematic_clusters } = body as { 
      pageUrl: string; 
      pageDiagnostics: PageDiagnostic[], 
      gscData?: GscDataRow[],
      strategicContext?: StrategicContext,
      thematic_clusters?: ThematicCluster[]
    };

    if (!pageUrl || !pageDiagnostics) {
      return Response.json({ error: 'pageUrl and pageDiagnostics are required.' }, { status: 400 });
    }

    const report = await deepAnalysisFlow({ 
        pageUrl, 
        pageDiagnostics, 
        gscData,
        strategicContext,
        thematic_clusters
    });

    return Response.json(report);

  } catch (error) {
    console.error('API Error in /api/deep-analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    
    return Response.json({ error: 'Failed to perform deep analysis.', details: errorMessage }, { status: 500 });
  }
}
