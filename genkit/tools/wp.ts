import { Suggestion } from '../../types';

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
        
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        if (totalPagesHeader) {
            totalPages = parseInt(totalPagesHeader, 10);
        }

        const items = await response.json();
        if (Array.isArray(items)) {
            allItems = allItems.concat(items);
        }
        
        if (!totalPagesHeader && items.length < perPage) {
            break;
        }

        page++;
    }
    return allItems;
};

// Helper function to strip HTML tags from a string
const stripHtml = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

// Real implementation of the MCP WordPress tool
export const wp = {
  async getAllPublishedUrls(siteRoot: string): Promise<string[]> {
    console.log(`Starting to fetch all published URLs from ${siteRoot}`);
    const WP_URL = siteRoot.replace(/\/$/, '');
    
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
        throw new Error(`Could not retrieve URLs from WordPress: ${errorMessage}`);
    }
  },

  async getPageContent(pageUrl: string): Promise<string> {
    console.log(`Fetching content for: ${pageUrl}`);
    try {
      const url = new URL(pageUrl);
      const siteRoot = `${url.protocol}//${url.hostname}`;
      const slug = url.pathname.split('/').filter(Boolean).pop();

      if (!slug) {
        throw new Error("Could not determine slug from URL");
      }
      
      const headers = { 'Content-Type': 'application/json' };
      const fields = '_fields=content.rendered';
      
      // Try to fetch from pages endpoint first
      let response = await fetch(`${siteRoot}/wp-json/wp/v2/pages?slug=${slug}&${fields}`, { headers });
      
      // If not found in pages, try posts
      if (response.status === 404 || (await response.clone().json()).length === 0) {
        console.log(`Not found in pages, trying posts for slug: ${slug}`);
        response = await fetch(`${siteRoot}/wp-json/wp/v2/posts?slug=${slug}&${fields}`, { headers });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch content. Status: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No content found for this URL via WP API.");
      }

      const contentHtml = data[0]?.content?.rendered;
      if (!contentHtml) {
        throw new Error("API response did not contain rendered content.");
      }

      const cleanText = stripHtml(contentHtml);
      console.log(`Successfully fetched and cleaned content for ${pageUrl}. Length: ${cleanText.length}`);
      return cleanText;

    } catch(error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`Failed to get page content for ${pageUrl}:`, errorMessage);
      throw new Error(`Could not retrieve content from WordPress for ${pageUrl}: ${errorMessage}`);
    }
  },
};