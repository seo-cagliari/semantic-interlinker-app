
import { wp } from '../../../genkit/tools/wp';
import { Suggestion } from '../../../types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { selectedSuggestions } = await req.json() as { selectedSuggestions: Suggestion[] };

    if (!selectedSuggestions || !Array.isArray(selectedSuggestions) || selectedSuggestions.length === 0) {
      return Response.json({ error: 'selectedSuggestions must be a non-empty array.' }, { status: 400 });
    }
    
    const result = await wp.createDraftsBatched(selectedSuggestions);

    return Response.json({ ok: true, result });

  } catch (error) {
    console.error('API Error in /api/draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return Response.json({ error: 'Failed to create drafts.', details: errorMessage }, { status: 500 });
  }
}