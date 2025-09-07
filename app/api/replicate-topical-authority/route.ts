import { replicateTopicalAuthorityFlow } from '../../../genkit/flows/interlinkFlow';
import { PillarRoadmap, BridgeArticleSuggestion } from '../../../types';
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
          console.error("Failed to enqueue data in replication stream", e);
        }
      };

      try {
        const body = await req.json();
        const { 
          existingRoadmap,
          newLocation,
        } = body as {
          existingRoadmap: { pillarRoadmaps: PillarRoadmap[]; bridgeSuggestions: BridgeArticleSuggestion[] };
          newLocation: string;
        };

        if (!existingRoadmap || !newLocation) {
          throw new Error('existingRoadmap and newLocation are required.');
        }

        const result = await replicateTopicalAuthorityFlow({
          existingRoadmap,
          newLocation,
          sendEvent,
        });

        sendEvent({ type: 'done', payload: result });

      } catch (error) {
        console.error('API Error in /api/replicate-topical-authority stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        sendEvent({ type: 'error', error: 'Failed to replicate topical authority roadmap.', details: errorMessage });
      } finally {
        try {
            controller.close();
        } catch (e) {
            console.error("Error closing the replication stream controller", e);
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