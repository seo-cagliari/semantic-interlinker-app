import { GoogleGenAI, Type } from "@google/genai";
import { SerpAnalysisResult, SerpPageData } from '../../types';

// Helper to fetch and parse content with a timeout
const fetchWithTimeout = async (url: string, timeout = 5000): Promise<string> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
        clearTimeout(id);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request to ${url} timed out after ${timeout}ms`);
        }
        throw error;
    }
};

// Helper function to strip HTML tags from a string
const stripHtml = (html: string): string => {
    if (!html) return '';
    // This regex is more aggressive to remove style, script tags and their content
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const serpAnalyzer = {
    async getSerpAnalysis(
        topic: string,
        apiKey: string,
        onProgress?: (message: string) => void
    ): Promise<SerpAnalysisResult> {
        console.log(`[SERP Analyzer] Starting analysis for topic: "${topic}"`);
        if (onProgress) onProgress(`Avvio analisi SERP per "${topic}"...`);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        // --- PHASE 1: FETCH SERP DATA ---
        let organicResults: any[] = [];
        let relatedSearches: string[] = [];
        let peopleAlsoAsk: string[] = [];

        try {
            const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(topic)}&api_key=${apiKey}&gl=it&hl=it&num=15`;
            const serpResponse = await fetch(serpApiUrl);
            if (!serpResponse.ok) {
                throw new Error(`SerpApi request failed with status ${serpResponse.status}`);
            }
            const serpJson = await serpResponse.json();
            organicResults = serpJson.organic_results?.slice(0, 10) || [];
            relatedSearches = serpJson.related_searches?.map((s: any) => s.query) || [];
            peopleAlsoAsk = serpJson.related_questions?.map((q: any) => q.question) || [];
            if (organicResults.length === 0) {
                throw new Error("No organic results found in SerpApi response.");
            }
        } catch (e) {
            console.error("[SERP Analyzer] Failed to fetch data from SerpApi:", e);
            throw new Error(`Impossibile recuperare i dati della SERP. Controlla la tua chiave API SerpApi e i crediti. Dettagli: ${e instanceof Error ? e.message : 'Errore sconosciuto'}`);
        }

        // --- PHASE 2: SCRAPE AND ANALYZE TOP URLs ---
        if (onProgress) onProgress(`Analisi dei contenuti per ${organicResults.length} pagine top-ranking...`);
        const scrapedPagesData: SerpPageData[] = [];
        
        const pageScraperSchema = {
            type: Type.OBJECT,
            properties: {
                headings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            text: { type: Type.STRING }
                        },
                        required: ["type", "text"]
                    }
                }
            },
            required: ["headings"]
        };
        
        for (let i = 0; i < organicResults.length; i++) {
            const result = organicResults[i];
            const url = result.link;
            try {
                if (onProgress) onProgress(`Scansione ${i + 1}/${organicResults.length}: ${url.substring(0, 50)}...`);
                const htmlContent = await fetchWithTimeout(url);
                const textContent = stripHtml(htmlContent).substring(0, 12000);

                const analysisPrompt = `
                    Analizza il seguente contenuto testuale di una pagina web. Il tuo unico compito è estrarre tutti i titoli H2 e H3 in ordine di apparizione.
                    Fornisci solo i titoli, senza commenti aggiuntivi.
                    ---
                    ${textContent}
                    ---
                `;
                
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: analysisPrompt,
                    config: { responseMimeType: "application/json", responseSchema: pageScraperSchema, seed: 42 }
                });

                if(response.text) {
                    const parsed = JSON.parse(response.text.trim());
                    scrapedPagesData.push({
                        url: url,
                        title: result.title,
                        headings: parsed.headings.filter((h: any) => h.type === 'h2' || h.type === 'h3'),
                    });
                }
            } catch (error) {
                console.warn(`[SERP Analyzer] Failed to scrape or analyze ${url}:`, error);
            }
        }

        if (scrapedPagesData.length === 0) {
            throw new Error("Could not scrape any of the top-ranking pages. This might be due to anti-scraping measures on the target sites.");
        }

        // --- PHASE 3: SYNTHESIZE THE IDEAL TOPICAL MAP ---
        if (onProgress) onProgress("Sintesi della mappa tematica ideale...");
        
        const synthesisPrompt = `
            Agisci come un SEO Strategist di livello mondiale. Hai appena condotto un'analisi approfondita della SERP per il topic "${topic}".
            
            DATI GREZZI DISPONIBILI:
            1.  Domande degli utenti (da "People Also Ask"): ${peopleAlsoAsk.join(', ')}
            2.  Ricerche Correlate: ${relatedSearches.join(', ')}
            3.  Struttura dei Contenuti dei Competitor (H2s e H3s):
                ${scrapedPagesData.map(p => `URL: ${p.url}\nTitoli: ${p.headings.map(h => h.text).join(' | ')}`).join('\n\n')}

            IL TUO COMPITO:
            Sintetizza questi dati grezzi in una "Mappa Tematica Ideale" e un riassunto strategico.
            
            ISTRUZIONI:
            1.  \`main_topic\`: Deve essere "${topic}".
            2.  \`sub_topics\`: Estrai e deduplica i sotto-argomenti più importanti e ricorrenti dai titoli dei competitor. Raggruppa concetti simili.
            3.  \`user_questions\`: Elenca le domande più pertinenti, combinando i dati "People Also Ask" con le domande implicite nei titoli dei competitor.
            4.  \`related_searches\`: Pulisci e includi le ricerche correlate più strategiche.
            5.  \`competitor_analysis_summary\`: Scrivi un paragrafo conciso che riassuma le strategie di contenuto dei competitor. Qual è l'intento dominante (informativo, commerciale)? Quali angolazioni usano? Ci sono formati di contenuto comuni (es. guide, liste, recensioni)?
            
            Fornisci l'output in formato JSON.
        `;

        const synthesisSchema = {
            type: Type.OBJECT,
            properties: {
                ideal_topical_map: {
                    type: Type.OBJECT,
                    properties: {
                        main_topic: { type: Type.STRING },
                        sub_topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                        user_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        related_searches: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["main_topic", "sub_topics", "user_questions", "related_searches"]
                },
                competitor_analysis_summary: { type: Type.STRING }
            },
            required: ["ideal_topical_map", "competitor_analysis_summary"]
        };

        const finalResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: synthesisPrompt,
            config: { responseMimeType: "application/json", responseSchema: synthesisSchema, seed: 42 }
        });
        
        if (!finalResponse.text) {
             throw new Error("Failed to synthesize the final SERP analysis report.");
        }

        console.log(`[SERP Analyzer] Analysis for "${topic}" completed successfully.`);
        if (onProgress) onProgress("Analisi SERP completata.");
        
        return JSON.parse(finalResponse.text.trim());
    }
};