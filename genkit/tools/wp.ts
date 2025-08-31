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
};