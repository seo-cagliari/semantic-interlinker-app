
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

// Helper to fetch all items from a paginated WP endpoint
const fetchAllPaginated = async (endpoint: string, headers: HeadersInit): Promise<any[]> => {
    let allItems: any[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by WP REST API
    let totalPages = 1;

    while (page <= totalPages) {
        const response = await fetch(`${endpoint}?per_page=${perPage}&page=${page}&status=publish&_fields=link`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch from ${endpoint}. Status: ${response.status}`);
        }
        
        // WP REST API returns total pages in headers
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        if (totalPagesHeader) {
            totalPages = parseInt(totalPagesHeader, 10);
        }

        const items = await response.json();
        if (Array.isArray(items)) {
            allItems = allItems.concat(items);
        }
        
        // If the header is missing, and we got less than perPage items, it's the last page
        if (!totalPagesHeader && items.length < perPage) {
            break;
        }

        page++;
    }
    return allItems;
};

// Real implementation of the MCP WordPress tool
export const wp = {
  async getAllPublishedUrls(siteRoot: string): Promise<string[]> {
    console.log(`Starting to fetch all published URLs from ${siteRoot}`);
    const WP_URL = siteRoot.replace(/\/$/, '');
    
    // For public posts, we don't need authentication
    const headers = { 'Content-Type': 'application/json' };

    try {
        const postsEndpoint = `${WP_URL}/wp-json/wp/v2/posts`;
        const pagesEndpoint = `${WP_URL}/wp-json/wp/v2/pages`;

        const [posts, pages] = await Promise.all([
            fetchAllPaginated(postsEndpoint, headers),
            fetchAllPaginated(pagesEndpoint, headers)
        ]);
        
        const allUrls = [...posts, ...pages].map(item => item.link);
        console.log(`Successfully fetched ${allUrls.length} URLs.`);
        return allUrls;

    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Failed to fetch all published URLs:", errorMessage);
        // Instead of throwing, we might return an empty array or handle it gracefully
        // For now, re-throwing to make it clear something failed.
        throw new Error(`Could not retrieve URLs from WordPress: ${errorMessage}`);
    }
  },

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
        const sourceUrlPath = new URL(suggestion.source_url).pathname;
        
        const postsResponse = await fetch(`${WP_URL}/wp-json/wp/v2/posts?path=${sourceUrlPath}`, { headers });
         if (!postsResponse.ok) throw new Error(`Failed to fetch source post. Status: ${postsResponse.status}`);
        
        const posts = await postsResponse.json();
        if (!posts || posts.length === 0) {
          throw new Error(`Source post with path '${sourceUrlPath}' not found.`);
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