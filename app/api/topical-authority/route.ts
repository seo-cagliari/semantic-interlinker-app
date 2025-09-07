import { topicalAuthorityFlow } from '../../../genkit/flows/interlinkFlow';
import { ThematicCluster, PageDiagnostic, OpportunityPage, PillarRoadmap, StrategicContext, BridgeArticleSuggestion } from '../../../types';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for this potentially long-running task

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        } catch (e) {
          console.error("Failed to enqueue data in topical authority stream", e);
        }
      };

      try {
        const body = await req.json();
        const { 
          site_root, 
          thematic_clusters,
          page_diagnostics,
          strategicContext,
        } = body as {
          site_root: string;
          thematic_clusters: ThematicCluster[];
          page_diagnostics: PageDiagnostic[];
          strategicContext: StrategicContext;
        };

        if (!site_root || !thematic_clusters || !strategicContext || !page_diagnostics) {
          throw new Error('site_root, thematic_clusters, page_diagnostics, and strategicContext are required.');
        }

        const result: { pillarRoadmaps: PillarRoadmap[]; bridgeSuggestions: BridgeArticleSuggestion[] } = await topicalAuthorityFlow({
          site_root,
          thematic_clusters,
          page_diagnostics,
          strategicContext,
          sendEvent,
        });

        sendEvent({ type: 'done', payload: result });

      } catch (error) {
        console.error('API Error in /api/topical-authority stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        sendEvent({ type: 'error', error: 'Failed to generate topical authority roadmap.', details: errorMessage });
      } finally {
        try {
            controller.close();
        } catch (e) {
            console.error("Error closing the topical authority stream controller", e);
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