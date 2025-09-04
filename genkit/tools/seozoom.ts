// This is a mock tool to simulate SEOZoom API calls without needing a real subscription during development.

// A simple hash function to generate deterministic "random" numbers from a string.
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const seozoom = {
  async getKeywordData(keyword: string, apiKey: string): Promise<{
    search_volume: number;
    keyword_difficulty: number;
    search_intent: string;
  }> {
    console.log(`[SEOZoom Mock Tool] Called for keyword: "${keyword}" with API key: ${apiKey ? 'provided' : 'not provided'}`);

    if (!apiKey) {
      console.warn("[SEOZoom Mock Tool] No API key provided. Returning default empty values.");
      return {
        search_volume: 0,
        keyword_difficulty: 0,
        search_intent: 'Unknown',
      };
    }
    
    const hash = simpleHash(keyword);
    
    // Simulate Search Volume (e.g., 0 to 5000)
    const search_volume = (hash % 500) * 10;

    // Simulate Keyword Difficulty (e.g., 10 to 80)
    const keyword_difficulty = 10 + (hash % 71);

    // Simulate Search Intent
    const intents = ['Informational', 'Transactional', 'Commercial', 'Navigational'];
    const search_intent = intents[hash % intents.length];

    console.log(`[SEOZoom Mock Tool] Mock data generated:`, { search_volume, keyword_difficulty, search_intent });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    return {
      search_volume,
      keyword_difficulty,
      search_intent,
    };
  }
};