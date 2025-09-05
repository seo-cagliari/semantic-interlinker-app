import { Suggestion } from '../../types';

// Helper to fetch all items from a paginated WP endpoint
const fetchAllPaginated = async (endpoint: string, headers: HeadersInit, fields: string): Promise<any[]> => {
    let allItems: any[] = [];
    let page = 1;
    const perPage = 100; // Max allowed by WP REST API
    let totalPages = 1;

    while (page <= totalPages) {
        const response = await fetch(`${endpoint}?per_page=${perPage}&page=${page}&status=publish&${fields}`, { headers });
        if (!response.ok) {
            console.error(`Failed to fetch from ${endpoint}. Status: ${response.status}, Body: ${await response.text()}`);
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
            break; // Exit if there are no more pages
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

export const wp = {
  async getAllPublishedPages(siteRoot: string): Promise<{ link: string; title: string; content: string }[]> {
    console.log(`Fetching all pages and posts with content from ${siteRoot}`);
    const WP_URL = siteRoot.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    const fields = '_fields=link,title.rendered,content.rendered';

    try {
        const postsEndpoint = `${WP_URL}/wp-json/wp/v2/posts`;
        const pagesEndpoint = `${WP_URL}/wp-json/wp/v2/pages`;

        const [posts, pages] = await Promise.all([
            fetchAllPaginated(postsEndpoint, headers, fields),
            fetchAllPaginated(pagesEndpoint, headers, fields)
        ]);

        const allItems = [...posts, ...pages].map(item => ({
            link: item.link,
            title: stripHtml(item.title?.rendered) || 'Untitled',
            content: item.content?.rendered || ''
        }));
        
        console.log(`Successfully fetched ${allItems.length} pages/posts with content.`);
        return allItems;

    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Failed to fetch all published pages with content:", errorMessage);
        throw new Error(`Could not retrieve pages with content from WordPress: ${errorMessage}`);
    }
  },

  async getAllInternalLinksFromAllPages(siteRoot: string, allPages: { link: string; content: string }[]): Promise<Record<string, string[]>> {
    console.log(`Parsing ${allPages.length} pages to map internal links.`);
    const internalLinksMap: Record<string, string[]> = {};
    const siteUrl = new URL(siteRoot);
    const siteDomain = siteUrl.hostname;

    const hrefRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;

    for (const page of allPages) {
        const sourceUrl = page.link;
        const outboundLinks = new Set<string>();
        let match;
        
        while ((match = hrefRegex.exec(page.content)) !== null) {
            let targetUrl = match[1];

            if (!targetUrl || targetUrl.startsWith('#') || targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:')) {
                continue;
            }
            
            try {
                const absoluteUrl = new URL(targetUrl, sourceUrl).toString().replace(/#.*$/, '');
                const targetHostname = new URL(absoluteUrl).hostname;
                
                if (targetHostname === siteDomain) {
                    outboundLinks.add(absoluteUrl);
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
        internalLinksMap[sourceUrl] = Array.from(outboundLinks);
    }
    
    console.log(`Internal link map created for ${Object.keys(internalLinksMap).length} pages.`);
    return internalLinksMap;
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
      
      let response = await fetch(`${siteRoot}/wp-json/wp/v2/pages?slug=${slug}&${fields}`, { headers });
      
      let data = await response.json();
      if (!response.ok || !Array.isArray(data) || data.length === 0) {
        console.log(`Not found in pages, trying posts for slug: ${slug}`);
        response = await fetch(`${siteRoot}/wp-json/wp/v2/posts?slug=${slug}&${fields}`, { headers });
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch content. Status: ${response.status}`);
      }
      
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
      console.error(`Failed to fetch content for ${pageUrl}:`, errorMessage);
      throw new Error(`Could not retrieve content for page ${pageUrl}: ${errorMessage}`);
    }
  }
};