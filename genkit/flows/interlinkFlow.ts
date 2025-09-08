import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Report, ThematicCluster, ContentGapSuggestion, DeepAnalysisReport, PageDiagnostic, GscDataRow, Suggestion, ProgressReport, ProgressMetric, OpportunityPage, StrategicActionPlan, Ga4DataRow, PillarRoadmap, ContentBrief, SerpAnalysisResult, StrategicContext, BridgeArticleSuggestion, InboundLinkSuggestion } from '../../types';
import { wp } from '../tools/wp';
import { seozoom } from '../tools/seozoom';
import { serpAnalyzer } from '../tools/serp';

/**
 * A wrapper function for ai.models.generateContent that implements an exponential backoff retry mechanism.
 * This makes the application more resilient to temporary server errors like 503 (Service Unavailable).
 * @param ai The GoogleGenAI instance.
 * @param params The parameters for the generateContent call.
 * @param maxRetries The maximum number of retry attempts.
 * @param initialDelay The initial delay in milliseconds for the backoff.
 * @param onRetry A callback function to send progress updates during retry waits.
 * @returns The GenerateContentResponse on success.
 * @throws The last caught error if all retries fail.
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: { model: string; contents: any; config: any },
  maxRetries = 4,
  initialDelay = 1000, // 1 second
  onRetry?: (attempt: number, delay: number) => void
): Promise<GenerateContentResponse> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await ai.models.generateContent(params);
      return result; // Success
    } catch (e) {
      lastError = e;
      const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
      
      // Check for transient errors like 503 (overloaded), 429 (rate limited), or other unavailable statuses.
      if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") || errorMessage.includes("overloaded") || errorMessage.includes("429")) {
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000; // Exponential backoff with jitter
          console.warn(`Attempt ${attempt + 1} failed with transient error. Retrying in ${Math.round(delay / 1000)}s...`);
          if (onRetry) {
            onRetry(attempt + 1, delay);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
           console.error(`Final attempt failed. Error: ${errorMessage}`);
        }
      } else {
        // Not a transient error, re-throw immediately
        throw e;
      }
    }
  }
  // If all retries failed, throw the last captured error
  throw lastError;
}


/**
 * Calcola un punteggio di autorità interna (stile PageRank) per ogni pagina.
 * @param linkMap Mappa di link: { sourceUrl: [targetUrl1, targetUrl2] }
 * @param pages Elenco di tutte le pagine con URL e titolo.
 * @param onProgress Callback per riportare lo stato di avanzamento delle iterazioni.
 * @returns Un elenco di pagine con il loro punteggio di autorità calcolato e normalizzato.
 */
function calculateInternalAuthority(
    linkMap: Record<string, string[]>,
    pages: { url: string; title: string }[],
    onProgress?: (current: number, total: number) => void
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
        if (onProgress) {
            onProgress(i + 1, ITERATIONS);
        }
    }

    const maxScore = Math.max(...scores);
    const normalizedScores = scores.map(s => (maxScore > 0 ? (s / maxScore) * 10 : 0));

    return pages.map((page, index) => ({
        url: page.url,
        title: page.title,
        score: parseFloat(normalizedScores[index].toFixed(2))
    }));
}

/**
 * Calcola le pagine con il maggior potenziale di crescita in base ai dati GSC.
 * @param gscData I dati grezzi da Google Search Console.
 * @param pageDiagnostics I dati di diagnostica delle pagine, inclusi URL e titolo.
 * @returns Un elenco di pagine con il loro punteggio di opportunità.
 */
function calculateOpportunityHub(
  gscData: GscDataRow[] | undefined,
  pageDiagnostics: PageDiagnostic[]
): OpportunityPage[] {
    if (!gscData || gscData.length === 0) {
        return [];
    }

    const pageStats: Record<string, { totalImpressions: number; weightedCtrSum: number; title: string }> = {};
    const urlToTitleMap = new Map(pageDiagnostics.map(p => [p.url, p.title]));

    gscData.forEach(row => {
        const url = row.keys[1];
        if (!url) return;
        
        if (!pageStats[url]) {
            pageStats[url] = {
                totalImpressions: 0,
                weightedCtrSum: 0,
                title: urlToTitleMap.get(url) || url,
            };
        }
        pageStats[url].totalImpressions += row.impressions;
        pageStats[url].weightedCtrSum += row.ctr * row.impressions;
    });

    const opportunities = Object.entries(pageStats)
        .map(([url, stats]) => {
            const averageCtr = stats.totalImpressions > 0 ? stats.weightedCtrSum / stats.totalImpressions : 0;
            // La formula dà più peso alle pagine con molte impressioni e basso CTR.
            const opportunityScore = stats.totalImpressions * (1 - averageCtr);

            return {
                url,
                title: stats.title,
                opportunity_score: opportunityScore,
                total_impressions: stats.totalImpressions,
                average_ctr: averageCtr,
            };
        })
        .filter(p => p.total_impressions > 100); // Filtra per pagine con un minimo di visibilità

    return opportunities.sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 15);
}


export async function interlinkFlow(options: {
  site_root: string;
  gscData?: GscDataRow[];
  gscSiteUrl?: string;
  seozoomApiKey?: string;
  strategyOptions?: { strategy: 'global' | 'pillar' | 'money'; targetUrls: string[] };
  ga4Data?: Ga4DataRow[];
  applyDraft: boolean;
  sendEvent: (event: object) => void;
}): Promise<void> {
  options.sendEvent({ type: 'progress', message: "Avvio dell'analisi strategica..." });
  if (!options.site_root) throw new Error("site_root is required for analysis.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const hasGscData = options.gscData && options.gscData.length > 0;
  const gscDataStringForPrompt = hasGscData
      ? `Inoltre, hai accesso ai seguenti dati reali di performance da Google Search Console (primi 200 record). Usali come fonte primaria per comprendere l'importanza delle pagine e l'intento dell'utente.
Formato: 'query', 'pagina', 'impressioni', 'ctr'
${options.gscData?.slice(0, 200).map(row => `"${row.keys[0]}", "${row.keys[1]}", ${row.impressions}, ${row.ctr}`).join('\n')}
${options.gscData!.length > 200 ? `(e altri ${options.gscData!.length - 200} record)` : ''}
`
      : "Non sono stati forniti dati da Google Search Console. Basa la tua analisi solo sulla struttura del sito.";
  
  const hasGa4Data = options.ga4Data && options.ga4Data.length > 0;
  const ga4DataStringForPrompt = hasGa4Data
    ? `Inoltre, hai accesso ai seguenti dati comportamentali da Google Analytics 4. Usali per valutare il valore strategico delle pagine.
Formato: 'pagePath', 'sessions', 'engagementRate', 'conversions'
${options.ga4Data?.slice(0, 150).map(row => `'${row.pagePath}', ${row.sessions}, ${row.engagementRate.toFixed(2)}, ${row.conversions}`).join('\n')}
`
    : "Non sono stati forniti dati da Google Analytics 4.";


  // PHASE 0: AUTHORITY & OPPORTUNITY CALCULATION
  options.sendEvent({ type: 'progress', message: "Fase 0: Scansione del sito e calcolo dell'autorità..." });
  const pageProgressCallback = (message: string) => {
    options.sendEvent({ type: 'progress', message });
  };
  const allPagesWithContent = await wp.getAllPublishedPages(options.site_root, pageProgressCallback);
  
  options.sendEvent({ type: 'progress', message: `Recuperate ${allPagesWithContent.length} pagine. Inizio analisi dei link interni...` });
  const internalLinksMap = await wp.getAllInternalLinksFromAllPages(
    options.site_root, 
    allPagesWithContent,
    (processed, total) => {
        options.sendEvent({ type: 'progress', message: `Analisi link interni: ${processed} / ${total} pagine...` });
    }
  );
  
  options.sendEvent({ type: 'progress', message: `Calcolo Punteggi di Autorità Interna...` });
  const pagesWithScores = calculateInternalAuthority(
      internalLinksMap,
      allPagesWithContent.map(p => ({ url: p.link, title: p.title })),
      (current, total) => {
        options.sendEvent({ type: 'progress', message: `Calcolo Autorità Interna (iterazione ${current}/${total})...` });
      }
  );

  const pageDiagnostics: PageDiagnostic[] = pagesWithScores.map(p => ({
    url: p.url,
    title: p.title,
    internal_authority_score: p.score,
  }));
  
  options.sendEvent({ type: 'progress', message: `Calcolo delle Opportunità di Crescita...` });
  const opportunityHub = calculateOpportunityHub(options.gscData, pageDiagnostics);

  // --- AGENT 1: INFORMATION ARCHITECT ---
  options.sendEvent({ type: 'progress', message: "Agente 1: L'Architetto dell'Informazione sta analizzando la struttura del sito..." });
  const allPagesList = allPagesWithContent.map(p => `"${p.title}": ${p.link}`).join('\n');

  const architectPrompt = `
    Sei un Architetto dell'Informazione e un SEO Strategist di fama mondiale.
    Il tuo compito è analizzare la seguente lista di pagine da un sito WordPress e raggrupparle in cluster tematici coerenti.
    Per ogni cluster, fornisci un nome conciso e una breve descrizione (1-2 frasi) del suo scopo.
    
    SITO: ${options.site_root}
    
    LISTA DI PAGINE (TITOLO: URL):
    ${allPagesList}
    
    ISTRUZIONI:
    1.  Crea tra 4 e 7 cluster tematici principali. Non essere troppo granulare.
    2.  Ogni pagina deve appartenere a un solo cluster.
    3.  I nomi dei cluster devono essere significativi e rappresentare il contenuto (es. "Servizi di Sviluppo Web", "Marketing dei Contenuti e Blog", "Risorse Aziendali").
    4.  Le descrizioni devono spiegare lo scopo del cluster e il tipo di contenuto che raggruppa.
  `;
  const architectSchema = {
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
  const architectResult = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: architectPrompt,
      config: { responseMimeType: "application/json", responseSchema: architectSchema, seed: 42 }
  });
  
  if (!architectResult.text) throw new Error("Agent 1 (Information Architect) failed to produce a response.");
  const { thematic_clusters } = JSON.parse(architectResult.text.trim()) as { thematic_clusters: ThematicCluster[] };

  // --- AGENT 2: SEMANTIC LINKING STRATEGIST ---
  options.sendEvent({ type: 'progress', message: "Agente 2: Lo Stratega Semantico sta generando suggerimenti di link..." });

  // Dynamically create a list of page titles and URLs for the prompt context
  const pageContextForPrompt = pageDiagnostics.map(p => `Pagina: "${p.title}" (URL: ${p.url}, Autorità: ${p.internal_authority_score.toFixed(1)}/10)`).join('\n');
  
  // Strategy-based filtering
  let candidatePagesForPrompt = allPagesWithContent;
  let strategyDescription = "Strategia di analisi: Globale. Analizza tutte le pagine del sito per opportunità di linking interno.";
  if (options.strategyOptions) {
      const { strategy, targetUrls } = options.strategyOptions;
      if (strategy === 'pillar' && targetUrls.length > 0) {
          const pillarUrl = targetUrls[0];
          const pillarCluster = thematic_clusters.find(c => c.pages.includes(pillarUrl));
          if (pillarCluster) {
              candidatePagesForPrompt = allPagesWithContent.filter(p => pillarCluster.pages.includes(p.link));
              strategyDescription = `Strategia di analisi: Pillar Page. L'analisi è focalizzata sul cluster "${pillarCluster.cluster_name}" per rafforzare la sua coerenza interna, partendo dalla pagina pillar: ${pillarUrl}.`;
          }
      } else if (strategy === 'money' && targetUrls.length > 0) {
          const moneyPageUrl = targetUrls[0];
          candidatePagesForPrompt = allPagesWithContent; // Global scope, but focus is on linking TO the money page
          strategyDescription = `Strategia di analisi: Money Page. L'obiettivo primario è trovare opportunità per linkare verso la pagina ad alta conversione: ${moneyPageUrl}, aumentandone l'autorità.`;
      }
  }

  const candidatePagesList = candidatePagesForPrompt.map(p => `- URL: ${p.link}\n  Titolo: "${p.title}"\n  Contenuto (estratto): "${p.content.substring(0, 300).replace(/\s+/g, ' ')}..."`).join('\n\n');
  
  const suggestionPrompt = `
    Sei un SEO Strategist di livello mondiale, specializzato in linking interno semantico e nella metodologia di Koray Tuğberk Gübür.
    Il tuo compito è analizzare un sito web e generare 10 suggerimenti di link interni di altissima qualità.
    
    SITO: ${options.site_root}
    ${strategyDescription}
    
    CONTESTO STRATEGICO (se disponibile):
    ${pageContextForPrompt}
    ${gscDataStringForPrompt}
    ${ga4DataStringForPrompt}

    PAGINE CANDIDATE PER L'ANALISI:
    ${candidatePagesList}

    ISTRUZIONI FONDAMENTALI:
    1.  PRIORITÀ ALLA STRATEGIA: Dai la massima priorità ai link che supportano il funnel di conversione. Un link da una pagina informativa ('Outer Section') a una pagina transazionale ('Core Section') ha un valore altissimo. Usa l'analisi dell'intento per guidare queste decisioni.
    2.  NON LINKARE PAGINE IDENTICHE: Evita di suggerire link tra pagine con contenuto quasi identico o che competono per le stesse query (cannibalizzazione). Se rilevi un rischio, segnalalo.
    3.  QUALITÀ SOPRA LA QUANTITÀ: Fornisci solo 10 suggerimenti che abbiano un impatto strategico reale.
    4.  POSIZIONAMENTO STRATEGICO: Per i link ad alto valore strategico (es. Outer -> Core), suggerisci una posizione 'late' (verso la fine del contenuto) per massimizzare l'engagement. Per altri link, valuta la posizione più naturale.
    5.  VARIAZIONE ANCHOR TEXT: Fornisci sempre 3 varianti per l'anchor text, usando sinonimi o frasi correlate per diversificare il profilo di link.
    6.  LOGICA DELL'INTENTO: Commenta sempre l'allineamento degli intenti (es. "da informativo a transazionale").
  `;

  const suggestionSchema = {
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
                          properties: {
                              block_type: { type: Type.STRING },
                              position_hint: { type: Type.STRING },
                              reason: { type: Type.STRING }
                          },
                          required: ["block_type", "position_hint", "reason"]
                      },
                      semantic_rationale: {
                          type: Type.OBJECT,
                          properties: {
                              topic_match: { type: Type.STRING },
                              entities_in_common: { type: Type.ARRAY, items: { type: Type.STRING } },
                              intent_alignment_comment: { type: Type.STRING }
                          },
                          required: ["topic_match", "entities_in_common", "intent_alignment_comment"]
                      },
                      risk_checks: {
                          type: Type.OBJECT,
                          properties: {
                              target_status: { type: Type.INTEGER },
                              target_indexable: { type: Type.BOOLEAN },
                              canonical_ok: { type: Type.BOOLEAN },
                              dup_anchor_in_block: { type: Type.BOOLEAN },
                              potential_cannibalization: { type: Type.BOOLEAN },
                              cannibalization_details: {
                                  type: Type.OBJECT,
                                  properties: {
                                      competing_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
                                      remediation_steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                                  }
                              }
                          },
                          required: ["target_status", "target_indexable", "canonical_ok", "dup_anchor_in_block", "potential_cannibalization"]
                      },
                      score: { type: Type.NUMBER }
                  },
                  required: ["suggestion_id", "source_url", "target_url", "proposed_anchor", "anchor_variants", "insertion_hint", "semantic_rationale", "risk_checks", "score"]
              }
          }
      },
      required: ["suggestions"]
  };
  const suggestionResult = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: suggestionPrompt,
      config: { responseMimeType: "application/json", responseSchema: suggestionSchema, seed: 42 }
  }, 4, 1000, (attempt, delay) => {
    options.sendEvent({ type: 'progress', message: `Agente 2 in attesa (tentativo ${attempt}). Riprovo tra ${Math.round(delay/1000)}s...` });
  });

  if (!suggestionResult.text) throw new Error("Agent 2 (Semantic Linking Strategist) failed to produce a response.");
  const { suggestions } = JSON.parse(suggestionResult.text.trim()) as { suggestions: Suggestion[] };

  // FINAL REPORT ASSEMBLY
  options.sendEvent({ type: 'progress', message: "Finalizzazione del report strategico..." });
  const finalReport: Report = {
      site: options.site_root,
      gscSiteUrl: options.gscSiteUrl,
      generated_at: new Date().toISOString(),
      summary: {
          pages_scanned: allPagesWithContent.length,
          indexable_pages: allPagesWithContent.length, // Placeholder, can be refined
          suggestions_total: suggestions.length,
          high_priority: suggestions.filter(s => s.score >= 0.75).length,
      },
      thematic_clusters,
      suggestions,
      content_gap_suggestions: [], // Inizialmente vuoto, verrà popolato on-demand
      page_diagnostics: pageDiagnostics,
      opportunity_hub: opportunityHub,
      internal_links_map: internalLinksMap,
      gscData: options.gscData,
      ga4Data: options.ga4Data
  };

  options.sendEvent({ type: 'done', payload: finalReport });
}

export async function contentStrategyFlow(options: {
  site_root: string;
  thematic_clusters: ThematicCluster[];
  gscData?: GscDataRow[];
  ga4Data?: Ga4DataRow[];
  seozoomApiKey?: string;
  strategicContext?: StrategicContext;
  sendEvent: (event: object) => void;
}): Promise<ContentGapSuggestion[]> {
  const { site_root, thematic_clusters, gscData, ga4Data, seozoomApiKey, strategicContext, sendEvent } = options;
  sendEvent({ type: 'progress', message: "Agente 3: Lo Stratega dei Contenuti sta analizzando i dati..." });
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const hasGscData = gscData && gscData.length > 0;
  const gscPromptPart = hasGscData
    ? `Dati GSC (prime 100 righe):
      ${gscData?.slice(0, 100).map(r => `${r.keys[0]}, ${r.keys[1]}, ${r.impressions}, ${r.ctr.toFixed(4)}`).join('\n')}
      Usa questi dati per identificare query con alte impressioni e basso CTR.`
    : "Nessun dato GSC fornito.";
  
  const ga4PromptPart = (ga4Data && ga4Data.length > 0)
    ? `Dati GA4 (prime 100 righe):
      ${ga4Data?.slice(0,100).map(r => `${r.pagePath}, sessions: ${r.sessions}, engagement: ${r.engagementRate.toFixed(2)}`).join('\n')}
      Usa questi dati per identificare pagine popolari ma con basso engagement, che potrebbero beneficiare di contenuti di supporto.`
    : "Nessun dato GA4 fornito.";
    
  const strategicContextPromptPart = strategicContext
    ? `CONTESTO DI BUSINESS FONDAMENTALE:
      - Obiettivo del sito (Source Context): "${strategicContext.source_context}"
      - Intento dell'utente target (Central Intent): "${strategicContext.central_intent}"
      I tuoi suggerimenti devono essere STRETTAMENTE allineati a questi obiettivi.`
    : "Nessun contesto di business fornito. Basa i suggerimenti sul potenziale di traffico generale.";

  const contentPrompt = `
    Sei un Content Strategist e SEO di livello mondiale. Il tuo compito è analizzare i dati di un sito per trovare opportunità di contenuto (content gap) strategiche.
    
    SITO: ${site_root}
    ${strategicContextPromptPart}

    CLUSTER TEMATICI ESISTENTI:
    ${thematic_clusters.map(c => `- ${c.cluster_name}: ${c.cluster_description}`).join('\n')}
    
    DATI DI PERFORMANCE:
    ${gscPromptPart}
    ${ga4PromptPart}
    
    ISTRUZIONI:
    1.  Analizza tutti i dati forniti per identificare 5-7 opportunità di contenuto mancanti che rafforzino i cluster esistenti o ne creino di nuovi e strategici.
    2.  Per ogni suggerimento, fornisci un titolo accattivante e una breve descrizione che spieghi perché è un'opportunità.
    3.  Assegna ogni suggerimento al cluster tematico più pertinente.
    4.  **PRIORITIZZAZIONE COMMERCIALE**: Assegna un 'commercial_opportunity_score' da 1 a 10. Un punteggio alto (8-10) significa che il contenuto è strettamente allineato al 'Source Context', intercetta un intento transazionale e può portare direttamente a conversioni. Un punteggio basso (1-4) indica un contenuto più informativo ('Outer Section') che costruisce fiducia ma è lontano dalla conversione.
    5.  Fornisci una motivazione chiara ('commercial_opportunity_rationale') per il punteggio assegnato.
    6.  Se trovi una query specifica e rilevante nei dati GSC, includila come 'target_query'.
    7.  **NON** suggerire contenuti che molto probabilmente esistono già basandoti sui nomi dei cluster. Cerca lacune evidenti.
  `;
  const contentSchema = {
    type: Type.OBJECT,
    properties: {
        content_gap_suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    relevant_cluster: { type: Type.STRING },
                    target_query: { type: Type.STRING },
                    commercial_opportunity_score: { type: Type.NUMBER },
                    commercial_opportunity_rationale: { type: Type.STRING }
                },
                required: ["title", "description", "relevant_cluster", "commercial_opportunity_score", "commercial_opportunity_rationale"]
            }
        }
    },
    required: ["content_gap_suggestions"]
  };
  
  const contentResult = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: contentPrompt,
    config: { responseMimeType: "application/json", responseSchema: contentSchema, seed: 42 }
  });
  
  if (!contentResult.text) throw new Error("Agent 3 (Content Strategist) failed to generate response.");
  const { content_gap_suggestions } = JSON.parse(contentResult.text.trim()) as { content_gap_suggestions: ContentGapSuggestion[] };

  if (seozoomApiKey) {
    sendEvent({ type: 'progress', message: "Arricchimento dei suggerimenti con dati di mercato SEOZoom..." });
    for (let i = 0; i < content_gap_suggestions.length; i++) {
        const suggestion = content_gap_suggestions[i];
        if (suggestion.target_query) {
             sendEvent({ type: 'progress', message: `Recupero dati per: "${suggestion.target_query}" (${i+1}/${content_gap_suggestions.length})` });
             const keywordData = await seozoom.getKeywordData(suggestion.target_query, seozoomApiKey);
             suggestion.search_volume = keywordData.search_volume;
             suggestion.keyword_difficulty = keywordData.keyword_difficulty;
             suggestion.search_intent = keywordData.search_intent;
        }
    }
  }

  return content_gap_suggestions;
}

export async function deepAnalysisFlow(options: {
  pageUrl: string;
  pageDiagnostics: PageDiagnostic[];
  gscData?: GscDataRow[];
  strategicContext?: StrategicContext;
  thematic_clusters?: ThematicCluster[];
}): Promise<DeepAnalysisReport> {
  const { pageUrl, pageDiagnostics, gscData, strategicContext, thematic_clusters } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const pageContent = await wp.getPageContent(pageUrl);
  const pageInfo = pageDiagnostics.find(p => p.url === pageUrl);
  
  const pageListForContext = pageDiagnostics.map(p => `- "${p.title}" (URL: ${p.url}, Autorità: ${p.internal_authority_score.toFixed(1)}/10)`).join('\n');
  const gscDataForPage = gscData?.filter(row => row.keys[1] === pageUrl).slice(0, 50);
  const opportunityQueries = gscDataForPage?.filter(q => q.impressions > 50 && q.ctr < 0.03) || [];
  
  const strategicContextPromptPart = (strategicContext && thematic_clusters)
    ? `CONTESTO STRATEGICO FONDAMENTALE:
      - Obiettivo del sito (Source Context): "${strategicContext.source_context}"
      - Cluster tematici del sito: ${thematic_clusters.map(c => `"${c.cluster_name}"`).join(', ')}`
    : "Nessun contesto strategico fornito. Esegui un'analisi SEO generica.";

  const deepAnalysisPrompt = `
    Sei un "Agente SEO Olistico Avanzato", un'IA che applica le metodologie strategiche di Koray Tuğberk Gübür.
    La tua missione è eseguire un'analisi chirurgica di una pagina web per massimizzarne l'impatto sul business, concentrandoti sul FLUSSO DI AUTORITÀ e sulla GERARCHIA TOPICA.
    
    ${strategicContextPromptPart}

    PAGINA DA ANALIZZARE (LA TARGET PAGE):
    - URL: ${pageUrl}
    - Titolo: "${pageInfo?.title}"
    - Punteggio di Autorità Interna: ${pageInfo?.internal_authority_score.toFixed(2)}/10
    - Contenuto (estratto): """
      ${pageContent.substring(0, 8000)}
      """

    DATI DI CONTESTO DELL'INTERO SITO:
    - Mappa di Tutte le Pagine del Sito con la loro Autorità:
      ${pageListForContext}
    - Query da Google Search Console per la TARGET PAGE (prime 50):
      ${gscDataForPage?.map(r => `"${r.keys[0]}" (Imp: ${r.impressions}, CTR: ${(r.ctr * 100).toFixed(2)}%)`).join('\n') || 'Nessun dato GSC disponibile.'}

    PROCESSO DI ANALISI STRATEGICA IN 4 FASI:

    FASE 1: DETERMINA IL RUOLO STRATEGICO
    Basandoti su tutto il contesto, determina il ruolo della TARGET PAGE. È una 'Core Section' (transazionale, servizio, prodotto) o una 'Outer Section' (informativa, blog, supporto)? Riassumi questa valutazione in 'page_strategic_role_summary'.

    FASE 2: CREA UN PIANO D'AZIONE ESECUTIVO
    Crea un piano d'azione ('action_plan') basato sul ruolo.
    - 'executive_summary': Un paragrafo che riassume la diagnosi e le azioni più critiche per allineare la pagina al suo ruolo strategico e ai dati GSC.
    - 'strategic_checklist': Una lista di 3-4 azioni concrete (es. Ottimizzazione CRO, Arricchimento Contenuto, Rafforzamento Autorità), con priorità.
      
    FASE 3: GENERA SUGGERIMENTI DI LINKING BASATI SULL'AUTORITÀ
    - 'inbound_links': Suggerisci 3-5 link in entrata di ALTO VALORE verso la TARGET PAGE.
        - REGOLA #1 (FLUSSO DI AUTORITÀ): Le pagine sorgente DEVONO avere un punteggio di autorità INTERNA PIÙ ALTO della TARGET PAGE. Identificale dalla mappa delle pagine fornita. Cerca le pagine più forti del sito.
        - REGOLA #2 (RILEVANZA STRATEGICA): I link devono essere semanticamente e strategicamente coerenti. Usa i cluster tematici forniti per guidare le tue decisioni.
        - REGOLA #3 (LINKING CROSS-CLUSTER): Un link da una pagina autorevole in un cluster tematico semanticamente ADIACENTE (es. da "Web Marketing" a "Realizzazione Siti Web") è estremamente prezioso. Cerca attivamente queste opportunità per creare ponti tematici.
        - REGOLA #4 (INTENTO): Privilegia link da pagine informative ('Outer Section') a pagine transazionali ('Core Section').
        - REGOLA #5 (ANCHOR TEXT): L'anchor text proposto deve essere guidato dalle 'Opportunity Queries' di GSC (alte impressioni, basso CTR).
        - La 'semantic_rationale' DEVE spiegare PERCHÉ il link è strategicamente valido, menzionando il flusso di autorità e la coerenza tematica (intra-cluster o cross-cluster).
    - 'outbound_links': Suggerisci 2-3 link in uscita dalla TARGET PAGE verso altre pagine interne che supportino il percorso dell'utente o rafforzino un altro cluster.

    FASE 4: IDENTIFICA OPPORTUNITÀ DI CONTENUTO
    - 'content_enhancements': Suggerisci 2-3 miglioramenti specifici per il contenuto della TARGET PAGE, mirati a catturare le 'Opportunity Queries' identificate in GSC. Questi suggerimenti saranno usati da un altro AI per generare il testo, quindi sii specifico (es. "Aggiungi una sezione che confronta X e Y", "Crea una checklist scaricabile su Z").
    - 'opportunity_queries': Elenca le 5 migliori query con alte impressioni e basso CTR dai dati GSC.
  `;
  const deepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
      analyzed_url: { type: Type.STRING },
      authority_score: { type: Type.NUMBER },
      action_plan: {
          type: Type.OBJECT,
          properties: {
              page_strategic_role_summary: { type: Type.STRING },
              executive_summary: { type: Type.STRING },
              strategic_checklist: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          priority: { type: Type.STRING }
                      },
                      required: ["title", "description", "priority"]
                  }
              }
          },
          required: ["page_strategic_role_summary", "executive_summary", "strategic_checklist"]
      },
      inbound_links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { source_url: { type: Type.STRING }, source_authority_score: { type: Type.NUMBER }, proposed_anchor: { type: Type.STRING }, semantic_rationale: { type: Type.STRING }, driving_query: { type: Type.STRING } }, required: ["source_url", "source_authority_score", "proposed_anchor", "semantic_rationale"] } },
      outbound_links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { target_url: { type: Type.STRING }, proposed_anchor: { type: Type.STRING }, semantic_rationale: { type: Type.STRING } }, required: ["target_url", "proposed_anchor", "semantic_rationale"] } },
      content_enhancements: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { suggestion_title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["suggestion_title", "description"] } },
      opportunity_queries: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, impressions: { type: Type.NUMBER }, ctr: { type: Type.NUMBER } }, required: ["query", "impressions", "ctr"] } }
    },
    required: ["analyzed_url", "authority_score", "action_plan", "inbound_links", "outbound_links", "content_enhancements", "opportunity_queries"]
  };
  
  const analysisResult = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: deepAnalysisPrompt,
    config: { responseMimeType: "application/json", responseSchema: deepAnalysisSchema, seed: 42 }
  });
  
  if (!analysisResult.text) throw new Error("Agent 4 (Semantic SEO Coach) failed to produce a response.");
  const report = JSON.parse(analysisResult.text.trim()) as DeepAnalysisReport;

  // Post-processing to add scores to the report if missing (failsafe)
  report.inbound_links.forEach(link => {
      if (!link.source_authority_score) {
          const sourcePage = pageDiagnostics.find(p => p.url === link.source_url);
          link.source_authority_score = sourcePage?.internal_authority_score || 0;
      }
  });

  return report;
}

export async function contentGenerationFlow(options: {
  enhancement_title: string;
  page_content: string;
  opportunity_queries: { query: string; impressions: number; ctr: number }[];
}): Promise<{ generated_html: string }> {
    const { enhancement_title, page_content, opportunity_queries } = options;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const generationPrompt = `
        Sei un "Copywriter SEO Semantico", un esperto nella creazione di contenuti naturali, persuasivi e ottimizzati per i motori di ricerca, pronti per essere incollati in WordPress.
        
        IL TUO COMPITO:
        Scrivere una nuova sezione di testo per una pagina web esistente, basandoti su un'istruzione specifica.
        
        ISTRUZIONE DI CONTENUTO: "${enhancement_title}"
        
        CONTESTO:
        - Query di Opportunità (da GSC, con alte impressioni e basso CTR) da integrare NATURALMENTE nel testo: 
          ${opportunity_queries.map(q => `"${q.query}"`).join(', ')}
        - Contenuto Esistente della Pagina (per capire tono di voce e contesto):
          """
          ${page_content.substring(0, 5000)} 
          """

        REGOLE FONDAMENTALI DI SCRITTURA E FORMATTAZIONE:
        1.  TITOLO OBBLIGATORIO: Il tuo output DEVE iniziare con un tag <h3> pertinente e SEO-friendly che riassuma l'argomento della sezione. L'ispirazione per il titolo deve venire dall' "ISTRUZIONE DI CONTENUTO".
        2.  STILE: Scrivi in modo umano, chiaro e coinvolgente. Evita il keyword stuffing.
        3.  LUNGHEZZA: Il testo generato (escluso il titolo) deve essere di circa 150-250 parole.
        4.  OTTIMIZZAZIONE: Integra le "Query di Opportunità" e i loro concetti correlati nel testo in modo fluido e logico, senza forzature.
        5.  FORMATTAZIONE HTML: Restituisci il testo in formato HTML pulito, pronto da copiare. Usa paragrafi (<p>), grassetto (<strong>) e, se appropriato, liste (<ul>, <li>) per una leggibilità ottimale. Non includere tag <html> o <body>.
        6.  FOCUS: Concentrati esclusivamente sulla creazione del nuovo contenuto richiesto. Non riassumere o commentare il contenuto esistente.
        
        ESEMPIO DI OUTPUT CORRETTO:
        <h3>Titolo SEO-Friendly per la Sezione</h3>
        <p>Questo è il primo paragrafo del contenuto, scritto in modo naturale e che integra una delle <strong>query di opportunità</strong> in modo logico.</p>
        <p>Questo è un secondo paragrafo che approfondisce l'argomento, mantenendo un tono professionale e utile per l'utente.</p>
    `;
    const generationSchema = {
        type: Type.OBJECT,
        properties: {
            generated_html: { type: Type.STRING, description: "Il contenuto HTML generato, pronto per essere inserito nella pagina." }
        },
        required: ["generated_html"]
    };

    const result = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: generationPrompt,
        config: { responseMimeType: "application/json", responseSchema: generationSchema, seed: 42 }
    });

    if (!result.text) {
        throw new Error("AI Semantic Copywriter failed to generate content.");
    }

    return JSON.parse(result.text.trim());
}


export async function progressAnalysisFlow(options: {
  previousReport: Report;
  newGscData: GscDataRow[];
}): Promise<ProgressReport> {
    const { previousReport, newGscData } = options;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const previousGscData = previousReport.gscData || [];
    const previousDataMap = new Map<string, GscDataRow>();
    previousGscData.forEach(row => {
        const key = `${row.keys[0]}|${row.keys[1]}`;
        previousDataMap.set(key, row);
    });

    const comparisonMetrics: ProgressMetric[] = [];
    newGscData.forEach(newRow => {
        const key = `${newRow.keys[0]}|${newRow.keys[1]}`;
        const oldRow = previousDataMap.get(key);
        if (oldRow && newRow.impressions > 50 && oldRow.impressions > 50) { // Consider only significant queries
            const ctrChange = newRow.ctr - oldRow.ctr;
            const positionChange = newRow.position - oldRow.position;
            // Add only if there's a noticeable positive change
            if (ctrChange > 0.005 || positionChange < -0.5) {
                comparisonMetrics.push({
                    page: newRow.keys[1],
                    query: newRow.keys[0],
                    initial_ctr: oldRow.ctr,
                    current_ctr: newRow.ctr,
                    initial_position: oldRow.position,
                    current_position: newRow.position,
                    ctr_change: ctrChange,
                    position_change: positionChange,
                });
            }
        }
    });
    
    // Sort to find the most significant wins
    comparisonMetrics.sort((a, b) => {
        const scoreA = a.ctr_change * 100 - a.position_change;
        const scoreB = b.ctr_change * 100 - b.position_change;
        return scoreB - scoreA;
    });

    const keyWins = comparisonMetrics.slice(0, 10);
    
    const progressPrompt = `
        Sei un Analista SEO. Analizza i seguenti dati di performance che confrontano due periodi.
        Il tuo compito è scrivere un breve paragrafo ('ai_summary') che riassuma i progressi più significativi.
        
        SITO: ${previousReport.site}
        PERIODO PRECEDENTE: ${previousReport.generated_at}
        
        VITTORIE PRINCIPALI (Miglioramenti in CTR e Posizione):
        ${keyWins.map(w => `- Query "${w.query}" per la pagina ${w.page} ha migliorato il CTR di ${(w.ctr_change * 100).toFixed(2)} punti e la posizione di ${-w.position_change.toFixed(1)} posti.`).join('\n')}
        
        ISTRUZIONI:
        - Sii incoraggiante e professionale.
        - Menziona 2-3 esempi specifici tratti dalle "Vittorie Principali".
        - Evidenzia se i miglioramenti sono concentrati su cluster tematici specifici, se possibile.
        - Concludi con un consiglio strategico su come mantenere lo slancio.
    `;
    const progressSchema = {
        type: Type.OBJECT,
        properties: { ai_summary: { type: Type.STRING } },
        required: ["ai_summary"]
    };

    const summaryResult = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: progressPrompt,
        config: { responseMimeType: "application/json", responseSchema: progressSchema, seed: 42 }
    });
    
    const ai_summary = summaryResult.text ? JSON.parse(summaryResult.text.trim()).ai_summary : "Analisi non disponibile.";

    return {
        site: previousReport.site,
        previous_report_date: previousReport.generated_at,
        current_report_date: new Date().toISOString(),
        key_wins: keyWins,
        ai_summary,
    };
}


export async function topicalAuthorityFlow(options: {
  site_root: string;
  thematic_clusters: ThematicCluster[];
  page_diagnostics: PageDiagnostic[];
  strategicContext: StrategicContext;
  sendEvent: (event: object) => void;
}): Promise<{ pillarRoadmaps: PillarRoadmap[]; bridgeSuggestions: BridgeArticleSuggestion[] }> {
  const { site_root, thematic_clusters, page_diagnostics, strategicContext, sendEvent } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // --- AGENT 4.1: PILLAR DISCOVERY AGENT ---
  sendEvent({ type: 'progress', message: "Agente 4.1: Il Consulente di Business sta identificando i Pillar strategici..." });
  
  const geoFocusPromptPart = strategicContext.geographic_focus
    ? `\n- Focus Geografico Primario: "${strategicContext.geographic_focus}". Considera questo focus nel definire i pillar, specialmente per argomenti come "SEO Locale".`
    : '';

  const pillarDiscoveryPrompt = `
    Sei un consulente di business e SEO strategist di altissimo livello. Il tuo compito è identificare i 2-5 "Pillar" tematici strategici per il sito ${site_root}, basandoti sugli obiettivi di business e sui contenuti esistenti.

    INPUT STRATEGICI:
    - Obiettivo del sito (Source Context): "${strategicContext.source_context}"
    - Intento dell'utente target (Central Intent): "${strategicContext.central_intent}"
    - Cluster tematici attuali: ${thematic_clusters.map(c => `"${c.cluster_name}"`).join(', ')}
    - Titoli di tutte le pagine del sito: ${page_diagnostics.map(p => `"${p.title}"`).join(', ')}
    ${geoFocusPromptPart}

    PROCESSO DECISIONALE IN 4 PASSI:
    1. PARTI DAL BUSINESS, NON DAI CONTENUTI: La tua decisione deve essere guidata principalmente dal "Source Context". Chiediti: "Quali 2-5 macro-categorie di servizi o argomenti deve coprire questo sito per raggiungere il suo obiettivo di business?".
    2. USA I CONTENUTI PER VALIDARE, NON PER ESSERE LIMITATO: Analizza i titoli di pagina e i cluster esistenti per capire di cosa parla GIA' il sito. Usa queste informazioni per raffinare i nomi dei Pillar che hai identificato al punto 1, ma NON farti limitare da essi.
    3. NON ESSERE INFLUENZATO DALLA QUANTITÀ: Anche se un argomento (es. "SEO") ha molti più contenuti di un altro (es. "Sviluppo Web"), se entrambi sono vitali per il business, devono essere considerati Pillar alla pari.
    4. SII COMPLETO: Se noti che un Pillar è strategicamente necessario per il business ma è quasi assente nei contenuti (es. un'agenzia che non parla di "Pubblicità Online"), identificalo comunque. L'obiettivo è definire la struttura IDEALE.

    Il tuo unico output deve essere un array di stringhe JSON con i nomi dei Pillar.
  `;
  const pillarDiscoverySchema = {
      type: Type.OBJECT,
      properties: {
          pillars: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
          }
      },
      required: ["pillars"]
  };
  const pillarResult = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: pillarDiscoveryPrompt,
    config: { responseMimeType: "application/json", responseSchema: pillarDiscoverySchema, seed: 42 }
  });
  if (!pillarResult.text) throw new Error("Agent 4.1 (Pillar Discovery) failed to produce a response.");
  const { pillars: discoveredPillars } = JSON.parse(pillarResult.text.trim()) as { pillars: string[] };
  
  sendEvent({ type: 'progress', message: `Pillar strategici identificati: ${discoveredPillars.join(', ')}` });

  // --- AGENT 4.2: CONTENT MAPPER AGENT ---
  sendEvent({ type: 'progress', message: "Agente 4.2: Il Content Mapper sta analizzando le pagine esistenti..." });
  const contentMapPrompt = `
    Sei un Information Architect. Il tuo compito è mappare un elenco di pagine web ai Pillar tematici forniti.

    PILLAR TEMATICI:
    ${discoveredPillars.map(p => `- ${p}`).join('\n')}

    ELENCO DI TUTTE LE PAGINE (URL):
    ${page_diagnostics.map(p => p.url).join('\n')}

    ISTRUZIONI:
    Per ogni Pillar, elenca gli URL delle pagine che appartengono a quel Pillar. Una pagina può appartenere a un solo Pillar. Sii il più accurato possibile.
    L'output deve essere un oggetto JSON con una singola chiave "mapped_content" che contiene un array di oggetti. Ogni oggetto deve avere "pillar_name" e un array "pages" con gli URL.
  `;

  const contentMapSchema = {
      type: Type.OBJECT,
      properties: {
          mapped_content: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      pillar_name: { type: Type.STRING },
                      pages: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["pillar_name", "pages"]
              }
          }
      },
      required: ["mapped_content"]
  };
  
  const mapResult = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: contentMapPrompt,
    config: { responseMimeType: "application/json", responseSchema: contentMapSchema, seed: 42 }
  });
  if (!mapResult.text) throw new Error("Agent 4.2 (Content Mapper) failed to produce a response.");
  
  const mappedContentResult = JSON.parse(mapResult.text.trim()) as { mapped_content: { pillar_name: string; pages: string[] }[] };
  const pageToPillarMap = (mappedContentResult.mapped_content || []).reduce((acc, item) => {
      acc[item.pillar_name] = item.pages;
      return acc;
  }, {} as Record<string, string[]>);


  // --- AGENT 4.3: GAP ANALYSIS AGENT ---
  const pillarPromises = discoveredPillars.map(async (pillar, index) => {
    sendEvent({ type: 'progress', message: `Agente 4.3: Analisi dei gap per il Pillar "${pillar}" (${index + 1}/${discoveredPillars.length})...` });

    const existingPagesForPillar = pageToPillarMap[pillar] || [];

    const geoFocusPromptPartForGap = strategicContext.geographic_focus
      ? `\n- FOCUS GEOGRAFICO: L'analisi deve essere fortemente orientata verso "${strategicContext.geographic_focus}". Quando suggerisci articoli (es. "Migliori Ristoranti"), devono essere contestualizzati a questa località (es. "Migliori Ristoranti a ${strategicContext.geographic_focus}").`
      : '';

    const gapAnalysisPrompt = `
      Sei il massimo esperto mondiale sull'argomento "${pillar}", con una profonda conoscenza della metodologia SEO di Koray Gübür.
      Il tuo compito è creare una roadmap di contenuti per colmare le lacune tematiche del sito ${site_root} per questo specifico Pillar.
      
      CONTESTO DI BUSINESS:
      - Obiettivo (Source Context): "${strategicContext.source_context}"
      - Intento Utente (Central Intent): "${strategicContext.central_intent}"
      ${geoFocusPromptPartForGap}

      PAGINE CHE IL SITO HA GIA' SCRITTO PER QUESTO PILLAR:
      ${existingPagesForPillar.length > 0 ? existingPagesForPillar.join('\n') : "Nessuna pagina esistente trovata per questo Pillar."}
      
      PROCESSO DI ANALISI IN 4 PASSI:
      1. COSTRUISCI LA MAPPA IDEALE: Mentalmente, costruisci la mappa tematica ideale e completa per l'argomento "${pillar}". Pensa a tutti i sotto-argomenti, a cascata, che un vero esperto tratterrebbe, dai concetti base a quelli più avanzati.
      2. ESEGUI UN CONFRONTO CHIRURGICO: Sovrapponi la tua mappa ideale all'elenco di pagine che il sito ha già scritto.
      3. IDENTIFICA I GAP REALI: Il tuo output deve includere SOLO ed ESCLUSIVAMENTE i cluster di contenuti e gli articoli che sono MANCANTI. NON SUGGERIRE MAI contenuti già trattati, anche parzialmente, dalle pagine esistenti.
      4. EVITA LA SOVRAPPOSIZIONE: Assicurati che i suggerimenti di articoli tra cluster e pillar diversi siano unici. Se due idee di contenuto sono molto simili, proponi un singolo articolo più completo nel cluster più pertinente.
      
      ISTRUZIONI PER L'OUTPUT:
      - 'strategic_summary': Un paragrafo che riassume lo stato attuale del Pillar e la strategia per colmare i gap, allineandola al Contesto di Business.
      - 'cluster_suggestions': Raggruppa gli articoli mancanti in 2-4 cluster tematici. Per ogni cluster:
          - 'cluster_name': Un nome significativo.
          - 'strategic_rationale': Spiega perché colmare questo gap è importante per il business.
          - 'impact_score': Assegna un punteggio da 1 a 10 all'impatto del cluster (10 = impatto massimo).
          - 'impact_rationale': Motiva il punteggio.
          - 'article_suggestions': Per ogni articolo suggerito:
              - 'title': Un titolo SEO-friendly.
              - 'target_queries': 3-5 query di ricerca pertinenti.
              - 'section_type': Classificalo come 'Core' (transazionale, vicino alla vendita) o 'Outer' (informativo, costruisce fiducia).
              - 'unique_angle': Fornisci una frase che descriva un 'angolo' unico o un valore aggiunto per l'articolo (es. 'Include un template scaricabile', 'Analizza 3 casi studio locali').
    `;

    const gapAnalysisSchema = {
      type: Type.OBJECT,
      properties: {
        strategic_summary: { type: Type.STRING },
        cluster_suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cluster_name: { type: Type.STRING },
              strategic_rationale: { type: Type.STRING },
              impact_score: { type: Type.NUMBER },
              impact_rationale: { type: Type.STRING },
              article_suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    target_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
                    section_type: { type: Type.STRING },
                    unique_angle: { type: Type.STRING }
                  },
                  required: ["title", "target_queries", "section_type", "unique_angle"]
                }
              }
            },
            required: ["cluster_name", "strategic_rationale", "impact_score", "impact_rationale", "article_suggestions"]
          }
        }
      },
      required: ["strategic_summary", "cluster_suggestions"]
    };
    
    const result = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: gapAnalysisPrompt,
      config: { responseMimeType: "application/json", responseSchema: gapAnalysisSchema, seed: 42 }
    });
    
    if (!result.text) {
        throw new Error(`Agent 4.3 (Gap Analysis) failed for pillar "${pillar}"`);
    }
    
    const analysisResult = JSON.parse(result.text.trim());
    return {
        pillar_name: pillar,
        strategic_summary: analysisResult.strategic_summary,
        cluster_suggestions: analysisResult.cluster_suggestions,
        existing_pages: existingPagesForPillar
    } as PillarRoadmap;
  });

  const pillarRoadmaps = await Promise.all(pillarPromises);

  // --- AGENT 4.4: BRIDGE BUILDER AGENT ---
  sendEvent({ type: 'progress', message: "Agente 4.4: Il Costruttore di Ponti sta cercando connessioni tra i Pillar..." });
  
  const bridgePrompt = `
    Sei un SEO Strategist olistico. Il tuo compito è identificare 1-3 opportunità per creare articoli "ponte" (Contextual Bridges) che colleghino semanticamente due Pillar diversi tra quelli elencati, unificando l'autorità del dominio.
    
    PILLAR DEL SITO:
    ${discoveredPillars.map(p => `- ${p}`).join('\n')}
    
    CONTESTO DI BUSINESS:
    - Obiettivo: "${strategicContext.source_context}"
    - Intento Utente: "${strategicContext.central_intent}"

    ISTRUZIONI:
    1.  Identifica le coppie di Pillar più sinergiche.
    2.  Per ogni coppia, suggerisci un titolo di articolo che crei un ponte logico tra i due.
    3.  Scrivi una breve descrizione che spieghi perché questo articolo è un buon ponte strategico.
    4.  Fornisci alcune query target pertinenti.
    5.  Assicurati che i suggerimenti siano allineati al Contesto di Business.
  `;
  const bridgeSchema = {
    type: Type.OBJECT,
    properties: {
      bridge_suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            connecting_pillars: { type: Type.ARRAY, items: { type: Type.STRING } },
            target_queries: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "description", "connecting_pillars", "target_queries"]
        }
      }
    },
    required: ["bridge_suggestions"]
  };
  
  let bridgeSuggestions: BridgeArticleSuggestion[] = [];
  try {
      const bridgeResult = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: bridgePrompt,
        config: { responseMimeType: "application/json", responseSchema: bridgeSchema, seed: 42 }
      });
      if(bridgeResult.text) {
        bridgeSuggestions = JSON.parse(bridgeResult.text.trim()).bridge_suggestions;
      }
  } catch (e) {
      console.warn("Agent 4.4 (Bridge Builder) failed to generate suggestions. Skipping.", e);
  }

  return { pillarRoadmaps, bridgeSuggestions };
}

export async function replicateTopicalAuthorityFlow(options: {
  existingRoadmap: { pillarRoadmaps: PillarRoadmap[]; bridgeSuggestions: BridgeArticleSuggestion[] };
  newLocation: string;
  sendEvent: (event: object) => void;
}): Promise<{ pillarRoadmaps: PillarRoadmap[]; bridgeSuggestions: BridgeArticleSuggestion[] }> {
  const { existingRoadmap, newLocation, sendEvent } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  sendEvent({ type: 'progress', message: `Adattamento della roadmap per "${newLocation}"...` });

  const replicationPrompt = `
    Sei un "Agente di Replicazione Geografica", un'IA specializzata in strategie SEO locali.
    Il tuo compito è prendere una roadmap di contenuti strategici creata per una località specifica e adattarla in modo intelligente per una NUOVA località.

    NUOVA LOCALITÀ DI DESTINAZIONE: "${newLocation}"

    ROADMAP ESISTENTE (JSON):
    ${JSON.stringify(existingRoadmap, null, 2)}

    ISTRUZIONI FONDAMENTALI:
    1.  SOSTITUZIONE INTELLIGENTE: Non fare un semplice "trova e sostituisci". Sostituisci la vecchia località (che dovrai dedurre dal contesto del JSON) con la NUOVA località ("${newLocation}") in tutti i campi pertinenti: 'title', 'strategic_summary', 'strategic_rationale', 'target_queries', 'unique_angle', 'description'.
    2.  ADATTAMENTO CONTESTUALE: Se trovi riferimenti regionali associati alla vecchia località (es. "Sardegna" se la vecchia città era "Cagliari"), adattali alla nuova regione (es. "Puglia" se la nuova città è "Bari").
    3.  MANTIENI LA STRUTTURA: La struttura dei dati, i punteggi ('impact_score'), i tipi di sezione ('Core'/'Outer'), e la logica strategica devono rimanere IDENTICI. Devi restituire l'intera struttura JSON, solo con i contenuti testuali adattati.
    4.  FORMATO OUTPUT: Il tuo output deve essere ESATTAMENTE lo stesso formato JSON della roadmap esistente fornita.

    Esegui l'adattamento e restituisci l'intero oggetto JSON aggiornato.
  `;

  const replicationSchema = {
      type: Type.OBJECT,
      properties: {
          pillarRoadmaps: { type: Type.ARRAY, items: { type: Type.OBJECT } }, // Define schemas if needed for strictness
          bridgeSuggestions: { type: Type.ARRAY, items: { type: Type.OBJECT } }
      },
      required: ["pillarRoadmaps", "bridgeSuggestions"]
  };

  const result = await generateContentWithRetry(ai, {
    model: "gemini-2.5-flash",
    contents: replicationPrompt,
    config: { responseMimeType: "application/json", responseSchema: replicationSchema, seed: 42 }
  });

  if (!result.text) {
      throw new Error("Geographic Replication Agent failed to produce a response.");
  }
  
  sendEvent({ type: 'progress', message: `Finalizzazione della nuova roadmap...` });
  
  return JSON.parse(result.text.trim());
}
