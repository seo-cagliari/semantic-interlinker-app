import { Suggestion } from '../../types';
// FIX: Import Buffer to resolve 'Cannot find name 'Buffer'' TypeScript error.
import { Buffer } from 'buffer';

// Helper function to safely get environment variables
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Real implementation of the MCP WordPress tool
export const wp = {
  async createDraftsBatched(suggestions: Suggestion[]) {
    console.log(`MCP: Starting batch creation of ${suggestions.length} drafts in WordPress...`);

    // These should be set in your Cloud Run service environment variables, linked from Secret Manager
    const WP_URL = getEnv('WORDPRESS_URL').replace(/\/$/, '');
    const WP_USER = getEnv('WORDPRESS_USER');
    const WP_APP_PASSWORD = getEnv('WORDPRESS_APP_PASSWORD');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64'),
    };

    let createdCount = 0;
    const errors: string[] = [];

    for (const suggestion of suggestions) {
      try {
        // 1. Find the source post ID from its URL
        const sourceUrl = new URL(suggestion.source_url);
        const sourceSlug = sourceUrl.pathname.split('/').filter(Boolean).pop();
        if (!sourceSlug) {
            throw new Error(`Could not determine slug from source URL: ${suggestion.source_url}`);
        }
        
        const postsResponse = await fetch(`${WP_URL}/wp-json/wp/v2/posts?slug=${sourceSlug}`, { headers });
        if (!postsResponse.ok) throw new Error(`Failed to fetch source post. Status: ${postsResponse.status}`);
        
        const posts = await postsResponse.json();
        if (!posts || posts.length === 0) {
          throw new Error(`Source post with slug '${sourceSlug}' not found.`);
        }
        const sourcePost = posts[0];

        // 2. Prepare the new content with the interlink
        const linkHtml = `<a href="${suggestion.target_url}">${suggestion.proposed_anchor}</a>`;
        
        // TODO: Implement a more sophisticated insertion logic based on suggestion.insertion_hint.
        // For now, we append the link within a new paragraph at the end of the content for safety.
        const newContent = `${sourcePost.content.rendered}\n\n<p>${linkHtml}</p>`;

        // 3. Create a new post in 'draft' status with the modified content
        const createDraftBody = {
          title: `[Draft] ${sourcePost.title.rendered}`,
          content: newContent,
          status: 'draft',
          // Optional: copy other metadata like categories, tags if needed
          // categories: sourcePost.categories,
          // tags: sourcePost.tags,
        };

        const createResponse = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createDraftBody),
        });

        if (!createResponse.ok) {
          const errorBody = await createResponse.json();
          throw new Error(`Failed to create draft. Status: ${createResponse.status}, Message: ${errorBody.message}`);
        }
        
        console.log(`Successfully created draft for source: ${suggestion.source_url}`);
        createdCount++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Failed to process suggestion ${suggestion.suggestion_id}:`, errorMessage);
        errors.push(`[${suggestion.source_url}]: ${errorMessage}`);
      }
    }
    
    console.log(`MCP: Batch creation finished. ${createdCount} drafts created, ${errors.length} failed.`);

    if (errors.length > 0) {
      // In a real app, you might want to return more structured error info
      throw new Error(`Completed with errors: \n${errors.join('\n')}`);
    }

    return { created: createdCount, errors: [] };
  }
};