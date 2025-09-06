
import { interlinkFlow } from '../../../genkit/flows/interlinkFlow';
import { GscDataRow, Ga4DataRow } from '../../../types';

export const dynamic = 'force-dynamic';
// Vercel specific configuration to increase the timeout for streaming responses
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        } catch (e) {
          console.error("Failed to enqueue data", e);
        }
      };

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
          throw new Error('site_root is required in the request body.');
        }

        // Pass the sendEvent function to the flow
        await interlinkFlow({
          site_root,
          gscData,
          gscSiteUrl,
          seozoomApiKey,
          strategyOptions,
          ga4Data,
          applyDraft: false,
          sendEvent,
        });

      } catch (error) {
        console.error('API Error in /api/analyze stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        sendEvent({ type: 'error', error: 'Failed to analyze the site.', details: errorMessage });
      } finally {
        try {
            controller.close();
        } catch (e) {
            console.error("Error closing the stream controller", e);
        }
      }
    }
  });

  return new Response(stream, {
    headers: { 
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
