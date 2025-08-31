
import { GoogleGenAI, Type } from "@google/genai";
import { Report, ThematicCluster, ContentGapSuggestion, DeepAnalysisReport, PageDiagnostic } from '../../types';
import { wp } from '../tools/wp';

/**
 * Calcola un punteggio di autorità interna (stile PageRank) per ogni pagina.
 * @param linkMap Mappa di link: { sourceUrl: [targetUrl1, targetUrl2] }
 * @param pages Elenco di tutte le pagine con URL e titolo.
 * @returns Un elenco di pagine con il loro punteggio di autorità calcolato e normalizzato.
 */
function calculateInternalAuthority(
    linkMap: Record<string, string[]>,
    pages: { url: string; title: string }[]
): { url: string; title: string; score: number }[] {
    const DAMPING_FACTOR = 0.85;
    const ITERATIONS = 20;

    const urlToIndex = new Map<string, number>(pages.map((p, i) => [p.url, i]));
    const N = pages.length;
    let scores = new Array(N).fill(1.0);

    const inboundLinks: number[][] = new Array(N).fill(0).map(() => []);
    const outboundCounts = new Array(N).fill(0);

    for (const sourceUrl in linkMap) {
        const sourceIndex = urlToIndex.get(sourceUrl);
        if (sourceIndex === undefined) continue;

        outboundCounts[sourceIndex] = linkMap[sourceUrl].length;

        for (const targetUrl of linkMap[sourceUrl]) {
            const targetIndex = urlToIndex.get(targetUrl);
            if (targetIndex !== undefined) {
                inboundLinks[targetIndex].push(sourceIndex);
            }
        }
    }

    for (let i = 0; i < ITERATIONS; i++) {
        const newScores = new Array(N).fill(0);
        for (let j = 0; j < N; j++) {
            let sum = 0;
            for (const inboundIndex of inboundLinks[j]) {
                if (outboundCounts[inboundIndex] > 0) {
                    sum += scores[inboundIndex] / outboundCounts[inboundIndex];
                }
            }
            newScores[j] = (1 - DAMPING_FACTOR) + DAMPING_FACTOR * sum;
        }
        scores = newScores;
    }

    const maxScore = Math.max(...scores);
    const normalizedScores = scores.map(s => (maxScore > 0 ? (s / maxScore) * 10 : 0));

    return pages.map((page, index) => ({
        url: page.url,
        title: page.title,
        score: parseFloat(normalizedScores[index].toFixed(2))
    }));
}


export async function interlinkFlow(options: {
  site_root: string;
  date_range?: string;
  maxSuggestions?: number;
  scoreThreshold?: number;
  applyDraft: boolean;
}): Promise<Report> {
  console.log("Real interlinkFlow triggered with options:", options);
  if (!options.site_root) throw new Error("site_root is required for analysis.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // PHASE 0: AUTHORITY CALCULATION
  console.log("Starting Phase 0: Authority Calculation...");
  const allPagesWithContent = await wp.getAllPublishedPages(options.site_root);
  const internalLinksMap = await wp.getAllInternalLinksFromAllPages(options.site_root, allPagesWithContent);
  const pagesWithScores = calculateInternalAuthority(
      internalLinksMap,
      allPagesWithContent.map(p => ({ url: p.link, title: p.title }))
  );
  
  const pageDiagnostics: PageDiagnostic[] = pagesWithScores.map(p => ({
      url: p.url,
      title: p.title,
      internal_authority_score: p.score
  }));
  console.log(`Phase 0 complete. Calculated authority for ${pageDiagnostics.length} pages.`);

  const allSiteUrls = pageDiagnostics.map(p => p.url);
  if (allSiteUrls.length === 0) {
    throw new Error("Could not find any published posts or pages on the specified WordPress site.");
  }

  // PHASE 1: THEMATIC CLUSTERING
  console.log("Starting Phase 1: Thematic Clustering...");
  // ... (The rest of the phases remain largely the same, but using allSiteUrls derived from pageDiagnostics)
  const clusterPrompt = `
    Agisci come un architetto dell'informazione e un esperto SEO per il sito "${options.site_root}".
    Ti viene fornito un elenco completo di URL dal sito.
    Il tuo compito è analizzare e raggruppare questi URL in 3-6 cluster tematici significativi.

    Per ogni cluster, devi fornire:
    1.  'cluster_name': Un nome conciso e descrittivo per il tema.
    2.  'cluster_description': Una breve frase (massimo 15 parole) che riassume l'argomento.
    3.  'pages': Un array contenente gli URL **dalla lista fornita** che appartengono a questo cluster.

    REGOLE IMPORTANTI:
    - La tua risposta DEVE essere un oggetto JSON valido che rispetti lo schema fornito.
    - Assegna ogni URL a un solo cluster.
    - Ignora pagine puramente funzionali (es. privacy, contatti) a meno che non siano centrali per il sito.

    Elenco completo degli URL da analizzare:
    ${allSiteUrls.join('\n')}

    Fornisci la risposta in lingua italiana.
  `;
  const clusterSchema = {
    type: Type.OBJECT,
    properties: {
      thematic_clusters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            cluster_name: { type: Type.STRING },
            cluster_description: { type: Type.STRING },
            pages: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["cluster_name", "cluster_description", "pages"]
        }
      }
    },
    required: ["thematic_clusters"]
  };
  let thematicClusters: ThematicCluster[] = [];
  try {
    const clusterResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: clusterPrompt,
        config: { responseMimeType: "application/json", responseSchema: clusterSchema, seed: 42 },
    });
    const responseText = clusterResponse.text;
    if (!responseText) throw new Error("Received empty response during clustering.");
    thematicClusters = JSON.parse(responseText.trim()).thematic_clusters;
    console.log(`Phase 1 complete. Identified ${thematicClusters.length} thematic clusters.`);
  } catch (e) {
    console.error(`Error during Thematic Clustering phase:`, e);
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Failed to generate thematic clusters. Error: ${detailedError}`);
  }

  // PHASE 2 & 3 (Suggerimenti e Content Gap) procedono come prima...
  // ... [Codice per FASE 2 e 3 omesso per brevità, è identico a prima] ...
  const suggestionPrompt = `
    Agisci come un esperto SEO di livello mondiale specializzato in internal linking semantico per il sito web "${options.site_root}".
    Ho già analizzato il sito e l'ho strutturato nei seguenti cluster tematici:
    ${JSON.stringify(thematicClusters, null, 2)}

    Il tuo compito ora è generare un elenco di suggerimenti di link interni ad alto impatto che rinforzino questi cluster.
    Dai priorità ai link che collegano pagine di supporto alle pagine principali all'interno dello stesso cluster.
    Suggerisci link tra cluster diversi solo se esiste una forte rilevanza contestuale.
    Tutti gli URL di origine e di destinazione devono provenire dall'elenco originale.

    Elenco completo degli URL disponibili:
    ${allSiteUrls.join('\n')}

    Per ogni suggerimento, fornisci un URL di origine, un URL di destinazione, un anchor text proposto con varianti, un suggerimento preciso per l'inserimento, una motivazione semantica e dei controlli di rischio.
    Genera ${options.maxSuggestions} suggerimenti.
    Il punteggio deve essere un numero decimale tra 0.5 e 0.95.

    IMPORTANTE: Fornisci tutti gli output testuali, inclusa la motivazione, in lingua italiana.
  `;

  const suggestionSchema: any = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    suggestion_id: { type: Type.STRING },
                    source_url: { type: Type.STRING },
                    target_url: { type: Type.STRING },
                    proposed_anchor: { type: Type.STRING },
                    anchor_variants: { type: Type.ARRAY, items: { type: Type.STRING } },
                    insertion_hint: {
                        type: Type.OBJECT,
                        properties: { block_type: { type: Type.STRING }, position_hint: { type: Type.STRING }, reason: { type: Type.STRING } },
                    },
                    semantic_rationale: {
                        type: Type.OBJECT,
                        properties: { topic_match: { type: Type.STRING }, entities_in_common: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    },
                    risk_checks: {
                        type: Type.OBJECT,
                        properties: { target_status: { type: Type.INTEGER }, target_indexable: { type: Type.BOOLEAN }, canonical_ok: { type: Type.BOOLEAN }, dup_anchor_in_block: { type: Type.BOOLEAN } },
                    },
                    score: { type: Type.NUMBER },
                    apply_mode: { type: Type.STRING }
                },
            }
        }
    },
  };
  
  let reportSuggestions: any[] = [];
  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: suggestionPrompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: suggestionSchema,
              seed: 42,
          },
      });
      
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Received an empty text response from Gemini during suggestion generation.");
      }
      
      const suggestionData = JSON.parse(responseText.trim());
      reportSuggestions = suggestionData.suggestions;
      console.log(`Phase 2 complete. Generated ${reportSuggestions.length} linking suggestions.`);

  } catch(e) {
      console.error("Error during Strategic Linking phase:", e);
      throw new Error("Failed to generate linking suggestions from Gemini API.");
  }

  // PHASE 3: CONTENT GAP ANALYSIS
  const contentGapPrompt = `
    Agisci come un SEO Content Strategist di livello mondiale per il sito "${options.site_root}".
    L'analisi del sito ha rivelato i seguenti cluster tematici principali:
    ${JSON.stringify(thematicClusters.map(c => ({ name: c.cluster_name, description: c.cluster_description })), null, 2)}

    Basandoti su questa struttura, identifica le lacune di contenuto. Quali articoli o argomenti mancano per rendere ogni cluster più completo e autorevole?
    Suggerisci 3-5 nuovi articoli strategici da scrivere. Per ogni suggerimento, fornisci:
    1.  Un titolo accattivante e ottimizzato per la SEO.
    2.  Una breve descrizione (1-2 frasi) che spieghi l'argomento e il suo valore per l'utente.
    3.  Il nome esatto del cluster tematico a cui questo nuovo contenuto appartiene.

    Fornisci la risposta in lingua italiana.
  `;
  
  const contentGapSchema = {
    type: Type.OBJECT,
    properties: {
      content_gap_suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            relevant_cluster: { type: Type.STRING }
          },
        }
      }
    },
  };

  let contentGapSuggestions: ContentGapSuggestion[] = [];
  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contentGapPrompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: contentGapSchema,
              seed: 42,
          },
      });

      const responseText = response.text;
      if (responseText) {
          const gapData = JSON.parse(responseText.trim());
          contentGapSuggestions = gapData.content_gap_suggestions;
          console.log(`Phase 3 complete. Identified ${contentGapSuggestions.length} content opportunities.`);
      }
  } catch(e) {
      console.error("Error during Content Gap Analysis phase:", e);
  }
  
  const finalReport: Report = {
    site: options.site_root,
    generated_at: new Date().toISOString(),
    thematic_clusters: thematicClusters,
    suggestions: reportSuggestions,
    content_gap_suggestions: contentGapSuggestions,
    page_diagnostics: pageDiagnostics,
    summary: {
        pages_scanned: allSiteUrls.length,
        indexable_pages: allSiteUrls.length,
        suggestions_total: reportSuggestions.length,
        high_priority: reportSuggestions.filter((s: any) => s.score >= 0.75).length,
    }
  };
  
  console.log("Analysis finished. Returning final report.");
  return finalReport;
}

export async function deepAnalysisFlow(options: {
  pageUrl: string;
  pageDiagnostics: PageDiagnostic[];
}): Promise<DeepAnalysisReport> {
  console.log(`Starting deep analysis for ${options.pageUrl}`);

  const analyzedPageDiagnostic = options.pageDiagnostics.find(p => p.url === options.pageUrl);
  if (!analyzedPageDiagnostic) {
    throw new Error(`Could not find page diagnostics for ${options.pageUrl}`);
  }

  const pageContent = await wp.getPageContent(options.pageUrl);
  if (!pageContent) {
    throw new Error(`Could not retrieve content for page: ${options.pageUrl}`);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const deepAnalysisPrompt = `
    Agisci come un SEO Architect di livello mondiale. Il tuo compito è analizzare in profondità una singola pagina per ottimizzare la sua rete di link interni e il suo contenuto, tenendo conto dell'autorità interna di ogni pagina.

    Pagina da analizzare: ${options.pageUrl}
    Punteggio di Autorità Interna di questa pagina: ${analyzedPageDiagnostic.internal_authority_score.toFixed(2)}/10
    (Un punteggio alto indica una pagina importante con molti link interni; un punteggio basso indica una pagina più isolata).

    Contesto: Questo è l'elenco di tutte le altre pagine del sito con i loro punteggi di autorità.
    ${options.pageDiagnostics.filter(p => p.url !== options.pageUrl).map(p => `[Score: ${p.internal_authority_score.toFixed(1)}] ${p.url}`).join('\n')}

    Contenuto della pagina (testo pulito):
    ---
    ${pageContent.substring(0, 8000)} 
    ---

    Basandoti sull'analisi semantica del contenuto, genera un report JSON con tre sezioni. Considera i punteggi di autorità:
    - Per i 'inbound_links', suggerisci link da pagine con un punteggio di autorità ALTO per potenziare questa pagina se il suo punteggio è basso.
    - Per gli 'outbound_links', suggerisci link da questa pagina verso pagine rilevanti, specialmente se questa pagina ha un'autorità alta da poter 'prestare'.

    1.  'inbound_links': Suggerisci un elenco di 3-5 pagine dall'elenco di contesto che dovrebbero collegarsi a questa pagina.
    2.  'outbound_links': Suggerisci un elenco di 2-4 link che questa pagina dovrebbe aggiungere verso altre pagine dell'elenco di contesto.
    3.  'content_enhancements': Suggerisci 2-3 miglioramenti concreti per il contenuto della pagina analizzata.

    REGOLE CRITICHE:
    - Tutti gli URL suggeriti DEVONO provenire dall'elenco di contesto.
    - Tutte le risposte testuali devono essere in lingua italiana.
    - La risposta DEVE essere un oggetto JSON valido.
  `;

  const deepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        inbound_links: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { source_url: { type: Type.STRING }, proposed_anchor: { type: Type.STRING }, semantic_rationale: { type: Type.STRING } },
            }
        },
        outbound_links: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { target_url: { type: Type.STRING }, proposed_anchor: { type: Type.STRING }, semantic_rationale: { type: Type.STRING } },
            }
        },
        content_enhancements: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { suggestion_title: { type: Type.STRING }, description: { type: Type.STRING } },
            }
        }
    },
  };

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: deepAnalysisPrompt,
        config: { responseMimeType: "application/json", responseSchema: deepAnalysisSchema, seed: 42, },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Received empty response from Gemini during deep analysis.");
    
    const report = JSON.parse(responseText.trim());
    report.analyzed_url = options.pageUrl;
    report.authority_score = analyzedPageDiagnostic.internal_authority_score;
    
    console.log(`Deep analysis for ${options.pageUrl} complete.`);
    return report;

  } catch (e) {
    console.error(`Error during deep analysis for ${options.pageUrl}:`, e);
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Failed to generate deep analysis report. Error: ${detailedError}`);
  }
}