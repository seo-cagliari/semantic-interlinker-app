
import { contentStrategyFlow } from '../../../genkit/flows/interlinkFlow';
import { ThematicCluster, GscDataRow, Ga4DataRow, ContentGapSuggestion, StrategicContext } from '../../../types';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        } catch (e) {
          console.error("Failed to enqueue data in content strategy stream", e);
        }
      };

      try {
        const body = await req.json();
        const { site_root, thematic_clusters, gscData, ga4Data, seozoomApiKey, strategicContext } = body as {
          site_root: string;
          thematic_clusters: ThematicCluster[];
          gscData?: GscDataRow[];
          ga4Data?: Ga4DataRow[];
          seozoomApiKey?: string;
          strategicContext?: StrategicContext;
        };
        
        if (!site_root || !thematic_clusters) {
          throw new Error('site_root and thematic_clusters are required.');
        }

        const suggestions: ContentGapSuggestion[] = await contentStrategyFlow({
          site_root,
          thematic_clusters,
          gscData,
          ga4Data,
          seozoomApiKey,
          strategicContext,
          sendEvent,
        });

        sendEvent({ type: 'done', payload: suggestions });

      } catch (error) {
        console.error('API Error in /api/content-strategy stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        sendEvent({ type: 'error', error: 'Failed to generate content strategy.', details: errorMessage });
      } finally {
        try {
            controller.close();
        } catch (e) {
            console.error("Error closing the content strategy stream controller", e);
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