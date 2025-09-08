import { NextRequest, NextResponse } from 'next/server';
import { contentGenerationFlow } from '../../../genkit/flows/interlinkFlow';
import { wp } from '../../../genkit/tools/wp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { enhancement_title, page_url, opportunity_queries } = body as {
            enhancement_title: string;
            page_url: string;
            opportunity_queries: { query: string; impressions: number; ctr: number }[];
        };

        if (!enhancement_title || !page_url || !opportunity_queries) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        // Fetch the full page content to provide context to the copywriter AI
        const page_content = await wp.getPageContent(page_url);

        const result = await contentGenerationFlow({
            enhancement_title,
            page_content,
            opportunity_queries
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('API Error in /api/generate-content:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        return NextResponse.json({ error: 'Failed to generate content.', details: errorMessage }, { status: 500 });
    }
}
