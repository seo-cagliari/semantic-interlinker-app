
import { interlinkFlow } from '../../../genkit/flows/interlinkFlow';
import { GscDataRow, Ga4DataRow } from '../../../types';

export const dynamic = 'force-dynamic'; // A convention for serverless functions to not be cached

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { site_root, gscData, gscSiteUrl, seozoomApiKey, strategyOptions, ga4Data } = body as { 
      site_root: string, 
      gscData?: GscDataRow[], 
      gscSiteUrl?: string,
      seozoomApiKey?: string,
      strategyOptions?: { strategy: 'global' | 'pillar' | 'money'; targetUrls: string[] };
      ga4Data?: Ga4DataRow[];
    };

    if (!site_root) {
      return Response.json({ error: 'site_root is required in the request body.' }, { status: 400 });
    }

    const report = await interlinkFlow({
      site_root,
      gscData,
      gscSiteUrl,
      seozoomApiKey,
      strategyOptions,
      ga4Data,
      applyDraft: false
    });

    return Response.json(report);

  } catch (error) {
    console.error('API Error in /api/analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    
    return Response.json({ error: 'Failed to analyze the site.', details: errorMessage }, { status: 500 });
  }
}
