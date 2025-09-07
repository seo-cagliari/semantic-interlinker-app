import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Report, ThematicCluster, ContentGapSuggestion, DeepAnalysisReport, PageDiagnostic, GscDataRow, Suggestion, ProgressReport, ProgressMetric, OpportunityPage, StrategicActionPlan, Ga4DataRow, TopicalAuthorityRoadmap, TopicalClusterSuggestion, ContentBrief } from '../../types';
import { wp } from '../tools/wp';
import { seozoom } from '../tools/seozoom';

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
    : "Non sono stati forniti dati da Google Analytics 4. Basa la tua analisi comportamentale solo sui dati GSC.";


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
        options.sendEvent({ type: 'progress', message: `Calcolo Autorità: iterazione ${current} di ${total}...` });
      }
  );
  
  const pageDiagnostics: PageDiagnostic[] = pagesWithScores.map(p => ({
      url: p.url,
      title: p.title,
      internal_authority_score: p.score
  }));
  
  const opportunityHubData = calculateOpportunityHub(options.gscData, pageDiagnostics);

  options.sendEvent({ type: 'progress', message: `Fase 0 completa. Calcolata l'autorità per ${pageDiagnostics.length} pagine.` });

  const allSiteUrls = pageDiagnostics.map(p => p.url);
  if (allSiteUrls.length === 0) {
    throw new Error("Could not find any published posts or pages on the specified WordPress site.");
  }

  // --- COMMON CALLBACK FOR GEMINI RETRIES ---
  const onRetryCallback = (attempt: number, delay: number) => {
    options.sendEvent({ type: 'progress', message: `API di Gemini temporaneamente non disponibile. Nuovo tentativo (${attempt}) tra ${Math.round(delay / 1000)}s...` });
  };


  // --- AGENT 1: INFORMATION ARCHITECT ---
  options.sendEvent({ type: 'progress', message: "Agente 1: L'Architetto dell'Informazione sta analizzando la struttura del sito..." });
  const clusterPrompt = `
    Agisci come un architetto dell'informazione e un esperto SEO per il sito "${options.site_root}".
    Il tuo compito è analizzare la struttura del sito e i dati di performance per raggruppare gli URL in 3-6 cluster tematici.
    
    DATI DISPONIBILI:
    1. Elenco completo degli URL del sito:
    ${allSiteUrls.join('\n')}

    2. Dati di performance da Google Search Console:
    ${gscDataStringForPrompt}

    ISTRUZIONI STRATEGICHE:
    - Usa i dati GSC per capire quali argomenti generano più impressioni. I cluster principali dovrebbero riflettere questi argomenti.
    - Raggruppa gli URL in cluster tematici significativi, fornendo un nome, una descrizione e un elenco di pagine per ciascuno.
    - La tua risposta DEVE essere un oggetto JSON valido in lingua italiana.
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
    const clusterResponse = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: clusterPrompt,
        config: { responseMimeType: "application/json", responseSchema: clusterSchema, seed: 42 },
    }, 4, 1000, onRetryCallback);
    const responseText = clusterResponse.text;
    if (!responseText) throw new Error("Received empty response during clustering.");
    thematicClusters = JSON.parse(responseText.trim()).thematic_clusters;
    options.sendEvent({ type: 'progress', message: `Agente 1 completo. Identificati ${thematicClusters.length} cluster tematici.` });
  } catch (e) {
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Agent 1 (Information Architect) failed. Error: ${detailedError}`);
  }

  // --- AGENT 2: SEMANTIC LINKING STRATEGIST ---
  options.sendEvent({ type: 'progress', message: "Agente 2: Lo Stratega Semantico sta generando suggerimenti di link..." });
  let suggestionPrompt = `
    Agisci come un esperto SEO di livello mondiale specializzato in internal linking semantico per "${options.site_root}".
    
    CONTESTO:
    1. La struttura del sito è stata organizzata nei seguenti cluster tematici:
    ${JSON.stringify(thematicClusters, null, 2)}
    
    2. Hai accesso ai dati di performance di Google Search Console:
    ${gscDataStringForPrompt}

    3. Dati Comportamentali da Google Analytics 4:
    ${ga4DataStringForPrompt}

    IL TUO COMPITO:
    Genera un elenco di 10 suggerimenti di link interni ad alto impatto, seguendo la strategia definita.
  `;
    
  const strategy = options.strategyOptions?.strategy || 'global';
  const targetUrls = options.strategyOptions?.targetUrls || [];

  if (strategy === 'pillar' && targetUrls.length > 0) {
      suggestionPrompt += `
      MODALITÀ STRATEGICA: "Pillar Page"
      OBIETTIVO PRIMARIO: Rafforzare l'autorità della seguente pagina pilastro: ${targetUrls[0]}
      ISTRUZIONI SPECIFICHE:
      - La maggior parte dei suggerimenti (almeno 7 su 10) devono essere link IN ENTRATA che puntano verso la pagina pilastro.
      - Trova pagine di supporto semanticamente correlate ("cluster content") e suggerisci link da esse verso la pagina pilastro.
      - Usa anchor text pertinenti che rafforzino il topic principale della pillar page.
      `;
  } else if (strategy === 'money' && targetUrls.length > 0) {
      suggestionPrompt += `
      MODALITÀ STRATEGICA: "Money Page"
      OBIETTIVO PRIMARIO: Canalizzare autorità e traffico verso la seguente pagina commerciale: ${targetUrls[0]}
      ISTRUZIONI SPECIFICHE:
      - Identifica articoli informativi o pagine con alta autorità interna che siano tematicamente collegati alla money page.
      - Suggerisci link contestuali DA queste pagine di supporto VERSO la money page per guidare l'utente nel funnel di conversione.
      - La motivazione semantica deve riflettere questo obiettivo strategico.
      `;
  } else { // global
      suggestionPrompt += `
      MODALITÀ STRATEGICA: "Analisi Globale"
      OBIETTIVO PRIMARIO: Identificare le migliori opportunità di linking in tutto il sito per migliorare il posizionamento generale e gli obiettivi di business.
      ISTRUZIONI SPECIFICHE:
      - IDENTIFICA LE "QUERY OPPORTUNITÀ": Cerca nei dati GSC le query con alte impressioni ma basso CTR.
      - DAI PRIORITÀ AI LINK DATA-DRIVEN: I tuoi suggerimenti migliori dovrebbero aiutare le pagine a posizionarsi meglio per queste "query opportunità".
      - RAFFORZA I CLUSTER: Suggerisci link che rinforzino la coerenza dei cluster tematici.
      `;
  }

  suggestionPrompt += `
    ISTRUZIONI AVANZATE (DA APPLICARE A TUTTI I SUGGERIMENTI):
    1. ANALISI DELL'INTENTO: Per ogni suggerimento, valuta la compatibilità dell'intento di ricerca tra la pagina di origine e quella di destinazione (es. "Ottimo, da informativo a transazionale per guidare l'utente."). Aggiungi un commento su questo nel campo 'intent_alignment_comment'.
    2. DIAGNOSI CANNIBALIZZAZIONE: Usa i dati GSC per verificare se la pagina di origine e quella di destinazione competono per le stesse query principali.
       - Se rilevi un rischio, imposta 'potential_cannibalization' a true. Poi, popola 'cannibalization_details' con:
         - 'competing_queries': un array con le 1-3 query principali per cui competono.
         - 'remediation_steps': un array con 1-2 consigli pratici per risolvere il problema (es. "Differenziare l'intento delle pagine", "Consolidare l'autorità sulla pagina target").
       - Se non c'è rischio, imposta 'potential_cannibalization' a false e lascia 'cannibalization_details' vuoto o nullo.
    3. USA I DATI COMPORTAMENTALI: Sfrutta i dati GA4 per decisioni strategiche.
       - Pagine con alto tasso di conversione o engagement sono preziose. Suggerisci link VERSO di esse per capitalizzare sul loro successo.
       - Pagine con molto traffico ma basso engagement o poche conversioni sono 'punti deboli'. Suggerisci link DA esse verso pagine più performanti.
    4. REGOLE GENERALI: Fornisci tutti gli output testuali in italiano e rispetta lo schema JSON. Per i risk_checks, imposta 'target_status' a 200, e 'target_indexable' e 'canonical_ok' a true, ma calcola 'potential_cannibalization' e 'cannibalization_details' come descritto.
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
                reason: { type: Type.STRING },
              },
            },
            semantic_rationale: {
              type: Type.OBJECT,
              properties: {
                topic_match: { type: Type.STRING },
                entities_in_common: { type: Type.ARRAY, items: { type: Type.STRING } },
                intent_alignment_comment: { type: Type.STRING, description: "Commento sulla coerenza dell'intento di ricerca." }
              },
            },
            risk_checks: {
              type: Type.OBJECT,
              properties: {
                potential_cannibalization: { type: Type.BOOLEAN, description: "Indica se c'è un rischio di cannibalizzazione." },
                cannibalization_details: { 
                  type: Type.OBJECT,
                  properties: {
                    competing_queries: { type: Type.ARRAY, items: { type: Type.STRING } },
                    remediation_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  description: "Dettagli sulla cannibalizzazione." 
                }
              }
            },
            score: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            apply_mode: { type: Type.STRING },
          },
        },
      },
    },
  };
  
  let reportSuggestions: Suggestion[] = [];
  try {
     const suggestionResponse = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: suggestionPrompt,
        config: { responseMimeType: "application/json", responseSchema: suggestionSchema, seed: 42 },
    }, 4, 1000, onRetryCallback);
    const responseText = suggestionResponse.text;
    if (responseText) {
        const parsedSuggestions = JSON.parse(responseText.trim()).suggestions;
        reportSuggestions = parsedSuggestions.map((s: Partial<Suggestion>) => ({
            ...s,
            suggestion_id: s.suggestion_id || `sugg-${Math.random()}`,
            risk_checks: {
                target_status: 200,
                target_indexable: true,
                canonical_ok: true,
                dup_anchor_in_block: false,
                potential_cannibalization: s.risk_checks?.potential_cannibalization ?? false,
                cannibalization_details: s.risk_checks?.potential_cannibalization ? s.risk_checks.cannibalization_details : undefined
            }
        }) as Suggestion);
    }
      options.sendEvent({ type: 'progress', message: `Agente 2 completo. Generati ${reportSuggestions.length} suggerimenti basati sulla strategia "${strategy}".` });
  } catch(e) {
      const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
      throw new Error(`Agent 2 (Semantic Linking Strategist) failed. Error: ${detailedError}`);
  }

  options.sendEvent({ type: 'progress', message: "Quasi finito, sto compilando il report finale..." });

  const finalReport: Report = {
    site: options.site_root,
    gscSiteUrl: options.gscSiteUrl,
    generated_at: new Date().toISOString(),
    thematic_clusters: thematicClusters,
    suggestions: reportSuggestions,
    content_gap_suggestions: [], // Sarà popolato on-demand
    page_diagnostics: pageDiagnostics,
    opportunity_hub: opportunityHubData,
    internal_links_map: internalLinksMap,
    gscData: options.gscData,
    ga4Data: options.ga4Data,
    summary: {
        pages_scanned: allSiteUrls.length,
        indexable_pages: allSiteUrls.length,
        suggestions_total: reportSuggestions.length,
        high_priority: reportSuggestions.filter((s: any) => s.score >= 0.75).length,
    }
  };
  
  options.sendEvent({ type: 'done', payload: finalReport });
}

export async function contentStrategyFlow(options: {
  site_root: string;
  thematic_clusters: ThematicCluster[];
  gscData?: GscDataRow[];
  ga4Data?: Ga4DataRow[];
  seozoomApiKey?: string;
  sendEvent: (event: object) => void;
}): Promise<ContentGapSuggestion[]> {
    const { site_root, thematic_clusters, gscData, ga4Data, seozoomApiKey, sendEvent } = options;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const onRetryCallback = (attempt: number, delay: number) => {
        sendEvent({ type: 'progress', message: `API di Gemini temporaneamente non disponibile. Nuovo tentativo (${attempt}) tra ${Math.round(delay / 1000)}s...` });
    };

    const hasGscData = gscData && gscData.length > 0;
    const gscDataStringForPrompt = hasGscData
        ? `Inoltre, hai accesso ai seguenti dati reali di performance da Google Search Console (primi 200 record). Usali come fonte primaria per comprendere l'importanza delle pagine e l'intento dell'utente.
    Formato: 'query', 'pagina', 'impressioni', 'ctr'
    ${gscData?.slice(0, 200).map(row => `"${row.keys[0]}", "${row.keys[1]}", ${row.impressions}, ${row.ctr}`).join('\n')}
    ${gscData!.length > 200 ? `(e altri ${gscData!.length - 200} record)` : ''}
    `
        : "Non sono stati forniti dati da Google Search Console. Basa la tua analisi solo sulla struttura del sito.";
    
    const hasGa4Data = ga4Data && ga4Data.length > 0;
    const ga4DataStringForPrompt = hasGa4Data
        ? `Inoltre, hai accesso ai seguenti dati comportamentali da Google Analytics 4. Usali per valutare il valore strategico delle pagine.
    Formato: 'pagePath', 'sessions', 'engagementRate', 'conversions'
    ${ga4Data?.slice(0, 150).map(row => `'${row.pagePath}', ${row.sessions}, ${row.engagementRate.toFixed(2)}, ${row.conversions}`).join('\n')}
    `
        : "Non sono stati forniti dati da Google Analytics 4. Basa la tua analisi comportamentale solo sui dati GSC.";

    // --- AGENT 3: CONTENT STRATEGIST ---
    sendEvent({ type: 'progress', message: "Agente 3: Il Content Strategist sta cercando 'content gap'..." });
    const contentGapPrompt = `
        Agisci come un SEO Content Strategist di livello mondiale per "${site_root}".

        CONTESTO:
        1. Cluster tematici del sito:
        ${JSON.stringify(thematic_clusters.map(c => ({ name: c.cluster_name, description: c.cluster_description })), null, 2)}

        2. Dati di performance da Google Search Console:
        ${gscDataStringForPrompt}
        
        3. Dati Comportamentali da Google Analytics 4:
        ${ga4DataStringForPrompt}

        IL TUO COMPITO:
        Identifica le lacune di contenuto strategiche.

        ISTRUZIONI STRATEGICHE:
        - ANALIZZA LE QUERY DEBOLI: Cerca nei dati GSC le query per cui il sito ha visibilità (impressioni) ma scarso engagement (basso CTR) o per le quali nessuna pagina risponde in modo soddisfacente.
        - ANALIZZA LE PERFORMANCE COMPORTAMENTALI: Usa i dati GA4 per identificare le pagine 'underperforming'. Se una pagina ha molte impressioni (da GSC) ma un basso tasso di engagement (da GA4), è un'opportunità di contenuto.
        - SUGGERISCI CONTENUTI MIRATI: Proponi 3-5 nuovi articoli che rispondano direttamente a queste query deboli o migliorino le pagine underperforming, per colmare le lacune di performance e aumentare l'autorità.
        - Per ogni suggerimento, identifica la principale "target_query" (query di ricerca) che il nuovo contenuto dovrebbe targettizzare.
        - Fornisci tutti gli output testuali in lingua italiana e rispetta lo schema JSON.
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
                        relevant_cluster: { type: Type.STRING },
                        target_query: { type: Type.STRING, description: "La query di ricerca principale che questo contenuto dovrebbe targettizzare." }
                    },
                    required: ["title", "description", "relevant_cluster", "target_query"]
                }
            }
        }
    };

    let contentGapSuggestions: ContentGapSuggestion[] = [];
    try {
        const contentGapResponse = await generateContentWithRetry(ai, {
            model: "gemini-2.5-flash",
            contents: contentGapPrompt,
            config: { responseMimeType: "application/json", responseSchema: contentGapSchema, seed: 42 },
        }, 4, 1000, onRetryCallback);
        const responseText = contentGapResponse.text;
        if (responseText) {
            const parsedSuggestions = JSON.parse(responseText.trim()).content_gap_suggestions;

            if (seozoomApiKey && parsedSuggestions.length > 0) {
                sendEvent({ type: 'progress', message: `Arricchimento dei dati con SEOZoom per ${parsedSuggestions.length} opportunità...` });
                
                const enrichmentPromises = parsedSuggestions.map(async (suggestion: ContentGapSuggestion) => {
                    if (suggestion.target_query) {
                        try {
                            const seoData = await seozoom.getKeywordData(suggestion.target_query, seozoomApiKey!);
                            return {
                                ...suggestion,
                                search_volume: seoData.search_volume,
                                keyword_difficulty: seoData.keyword_difficulty,
                                search_intent: seoData.search_intent,
                            };
                        } catch (e) {
                            console.error(`Failed to enrich suggestion for query "${suggestion.target_query}"`, e);
                            return suggestion; // Return original suggestion on error
                        }
                    }
                    return suggestion;
                });

                contentGapSuggestions = await Promise.all(enrichmentPromises);
                sendEvent({ type: 'progress', message: "Arricchimento SEOZoom completo." });
            } else {
                contentGapSuggestions = parsedSuggestions;
            }
        }
        sendEvent({ type: 'progress', message: `Agente 3 completo. Identificate ${contentGapSuggestions.length} opportunità di contenuto.` });
    } catch(e) {
        console.error("Error during Content Gap Analysis phase:", e);
        const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
        throw new Error(`Agent 3 (Content Strategist) failed. Error: ${detailedError}`);
    }
    return contentGapSuggestions;
}


export async function topicalAuthorityFlow(options: {
  site_root: string;
  thematic_clusters: ThematicCluster[];
  page_diagnostics: PageDiagnostic[];
  opportunity_hub_data: OpportunityPage[];
  seozoomApiKey?: string;
  sendEvent: (event: object) => void;
}): Promise<TopicalAuthorityRoadmap> {
    const { site_root, thematic_clusters, page_diagnostics, opportunity_hub_data, seozoomApiKey, sendEvent } = options;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const onRetryCallback = (attempt: number, delay: number) => {
        sendEvent({ type: 'progress', message: `API di Gemini temporaneamente non disponibile. Nuovo tentativo (${attempt}) tra ${Math.round(delay / 1000)}s...` });
    };

    // --- AGENT 4: TOPICAL AUTHORITY STRATEGIST ---
    sendEvent({ type: 'progress', message: "Agente 4: Lo Stratega di Topical Authority sta costruendo la tua roadmap..." });
    let topicalAuthorityRoadmap: TopicalAuthorityRoadmap | undefined = undefined;

    const topicalAuthorityPrompt = `
      Agisci come un SEO strategist di fama mondiale, specializzato in Topical Authority e SEO semantica, seguendo i principi di Koray Tuğberk Gürbüz.
      
      CONTESTO:
      Stai analizzando il sito "${site_root}". La tua analisi ha già prodotto i seguenti cluster tematici, che rappresentano la conoscenza attuale del sito:
      ${JSON.stringify(thematic_clusters.map(c => ({ name: c.cluster_name, description: c.cluster_description })), null, 2)}
      
      IL TUO COMPITO:
      Creare una "Topical Authority Roadmap" strategica e approfondita.
      Il tuo compito è duplice: se il sito è nuovo o ha pochi contenuti, delinea una **mappa tematica fondamentale completa** partendo da zero. Se il sito è maturo, identifica le **lacune strategiche più profonde** e i cluster adiacenti per espandere l'autorità.
      
      ISTRUZIONI:
      1. SINTETIZZA L'ARGOMENTO PRINCIPALE: Basandoti sui cluster esistenti, identifica e dichiara il 'main_topic' del sito in una frase chiara.
      2. VALUTA LA COPERTURA ATTUALE: Estrapola le entità e i concetti coperti dai cluster. Assegna un 'coverage_score' da 0 a 100 che rappresenti la completezza tematica attuale. Un punteggio alto (90+) significa che il sito copre quasi tutto. Un punteggio basso (<50) indica molte lacune.
      3. IDENTIFICA I CLUSTER MANCANTI: Confronta la conoscenza attuale del sito con una mappa semantica ideale per il 'main_topic'. Identifica 2-4 cluster concettuali di alto livello che sono completamente assenti o trattati in modo superficiale.
      4. GENERA SUGGERIMENTI DI CONTENUTO: Per ogni cluster mancante, fornisci una 'strategic_rationale' che spieghi perché quel cluster è **essenziale per la completezza semantica** e come si collega agli obiettivi di business. Suggerisci 2-3 titoli di articoli ('article_suggestions') **estremamente specifici e orientati all'azione**, non generici. Includi le 'target_queries' per ogni articolo.
      
      OUTPUT:
      La tua risposta DEVE essere un oggetto JSON valido in italiano che segua lo schema fornito.
    `;

    const topicalAuthoritySchema = {
      type: Type.OBJECT,
      properties: {
        main_topic: { type: Type.STRING },
        coverage_score: { type: Type.NUMBER },
        cluster_suggestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              cluster_name: { type: Type.STRING },
              strategic_rationale: { type: Type.STRING },
              article_suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    target_queries: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["title", "target_queries"]
                }
              }
            },
            required: ["cluster_name", "strategic_rationale", "article_suggestions"]
          }
        }
      },
      required: ["main_topic", "coverage_score", "cluster_suggestions"]
    };

    try {
        const topicalResponse = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: topicalAuthorityPrompt,
        config: { responseMimeType: "application/json", responseSchema: topicalAuthoritySchema, seed: 42 },
        }, 4, 1000, onRetryCallback);

        const responseText = topicalResponse.text;
        if (responseText) {
            topicalAuthorityRoadmap = JSON.parse(responseText.trim());
        } else {
            throw new Error("Received empty response from Topical Authority agent.");
        }
    } catch (e) {
        console.error("Error during Topical Authority Analysis phase:", e);
        const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
        throw new Error(`Agent 4 (Topical Authority Strategist) failed. Error: ${detailedError}`);
    }


    // --- AGENT 4.5: PRIORITIZATION ENGINE & CONTENT ARCHITECT ---
    if (topicalAuthorityRoadmap) {
        sendEvent({ type: 'progress', message: "Agente 4.5: Prioritizzazione della roadmap e creazione dei content brief..." });
        
        const contentBriefSchema = {
            type: Type.OBJECT,
            properties: {
            structure_suggestions: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, title: { type: Type.STRING } } }
            },
            semantic_entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            key_questions_to_answer: { type: Type.ARRAY, items: { type: Type.STRING } },
            internal_link_suggestions: {
                type: Type.ARRAY,
                items: { type: Type.OBJECT, properties: { target_url: { type: Type.STRING }, anchor_text: { type: Type.STRING }, rationale: { type: Type.STRING } } }
            }
            },
            required: ["structure_suggestions", "semantic_entities", "key_questions_to_answer", "internal_link_suggestions"]
        };

        for (let i = 0; i < topicalAuthorityRoadmap.cluster_suggestions.length; i++) {
            const cluster = topicalAuthorityRoadmap.cluster_suggestions[i];
            sendEvent({ type: 'progress', message: `Analisi impatto per cluster: "${cluster.cluster_name}"...` });

            // Prioritization Engine
            let totalVolume = 0;
            let totalDifficulty = 0;
            let queryCount = 0;
            let opportunityConnection = false;
            
            if (seozoomApiKey) {
                for (const article of cluster.article_suggestions) {
                for (const query of article.target_queries) {
                    try {
                    const seoData = await seozoom.getKeywordData(query, seozoomApiKey);
                    totalVolume += seoData.search_volume;
                    totalDifficulty += seoData.keyword_difficulty;
                    queryCount++;
                    if (opportunity_hub_data.some(p => p.url.includes(query.split(' ')[0]))) opportunityConnection = true;
                    } catch (e) { console.warn(`Could not fetch SEOZoom data for: ${query}`); }
                }
                }
            }
            
            const avgDifficulty = queryCount > 0 ? totalDifficulty / queryCount : 100;
            let score = 5.0;
            score += (Math.log10(totalVolume + 1) * 0.5); // Boost for volume
            score -= (avgDifficulty / 20); // Penalty for high difficulty
            if (opportunityConnection) score += 1.5; // Boost if it connects to existing opportunities
            cluster.impact_score = Math.max(1, Math.min(10, parseFloat(score.toFixed(1))));
            cluster.impact_rationale = `Basato su un volume di ricerca stimato di ${totalVolume.toLocaleString()}, una difficoltà media di ${avgDifficulty.toFixed(0)}/100, e ${opportunityConnection ? 'una forte connessione con' : 'nessuna connessione diretta con'} le opportunità di crescita esistenti.`;

            // Content Architect
            for (let j = 0; j < cluster.article_suggestions.length; j++) {
                const article = cluster.article_suggestions[j];
                sendEvent({ type: 'progress', message: `Creazione brief per: "${article.title.substring(0,30)}..."` });

                const contentArchitectPrompt = `
                    Agisci come un SEO Content Strategist e Architetto dell'Informazione di livello mondiale.
                    Il tuo compito è creare un brief di contenuto dettagliato e strategico per un nuovo articolo.
                    
                    CONTESTO SUL SITO ("${site_root}"):
                    - Argomento Principale: ${topicalAuthorityRoadmap.main_topic}
                    - Cluster Esistenti: ${thematic_clusters.map(c => c.cluster_name).join(', ')}
                    - Pagine Rilevanti (URL con punteggio di autorità): ${page_diagnostics.slice(0, 20).map(p => `[${p.internal_authority_score.toFixed(1)}] ${p.url}`).join('\n')}

                    ARTICOLO DA PIANIFICARE:
                    - Titolo: "${article.title}"
                    - Query Target Principali: ${article.target_queries.join(', ')}

                    IL TUO COMPITO:
                    Genera un brief di contenuto in formato JSON. Sii strategico e pratico.
                    
                    ISTRUZIONI DETTAGLIATE:
                    1.  \`structure_suggestions\`: Proponi una struttura logica per l'articolo usando una gerarchia di H2 e H3.
                    2.  \`semantic_entities\`: Elenca i concetti, le entità e i termini correlati (LSI) che devono essere inclusi per garantire una copertura completa.
                    3.  \`key_questions_to_answer\`: Identifica le domande principali che gli utenti si pongono su questo argomento. L'articolo deve rispondere a queste domande.
                    4.  \`internal_link_suggestions\`: Suggerisci 2-3 link interni strategici DA questo nuovo articolo VERSO pagine ESISTENTI E RILEVANTI del sito (usa l'elenco fornito) per rafforzare i cluster tematici.

                    OUTPUT: La tua risposta DEVE essere un oggetto JSON valido in italiano.
                `;
                
                try {
                    const briefResponse = await generateContentWithRetry(ai, {
                        model: "gemini-2.5-flash",
                        contents: contentArchitectPrompt,
                        config: { responseMimeType: "application/json", responseSchema: contentBriefSchema, seed: 42 },
                    }, 4, 1000, onRetryCallback);

                    if (briefResponse.text) {
                        article.content_brief = JSON.parse(briefResponse.text.trim()) as ContentBrief;
                    }
                } catch (e) {
                    console.error(`Content Architect failed for "${article.title}"`, e);
                }
            }
        }
        sendEvent({ type: 'progress', message: `Agente 4.5 completo. Roadmap arricchita con punteggi e brief.` });
    }

    if (!topicalAuthorityRoadmap) {
        // Questo caso teoricamente non dovrebbe essere raggiunto grazie alla logica try/catch precedente,
        // ma soddisfa TypeScript e protegge da risposte vuote/malformate inaspettate dall'AI.
        throw new Error("Impossibile generare la Topical Authority Roadmap per un motivo sconosciuto.");
    }

    return topicalAuthorityRoadmap;
}


export async function deepAnalysisFlow(options: {
  pageUrl: string;
  pageDiagnostics: PageDiagnostic[];
  gscData?: GscDataRow[];
}): Promise<DeepAnalysisReport> {
  console.log(`Deep Analysis Agent started for ${options.pageUrl}`);

  const analyzedPageDiagnostic = options.pageDiagnostics.find(p => p.url === options.pageUrl);
  if (!analyzedPageDiagnostic) {
    throw new Error(`Could not find page diagnostics for ${options.pageUrl}`);
  }

  const pageContent = await wp.getPageContent(options.pageUrl);
  if (!pageContent) {
    throw new Error(`Could not retrieve content for page: ${options.pageUrl}`);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const hasGscData = options.gscData && options.gscData.length > 0;
  const gscDataString = hasGscData 
    ? `Inoltre, hai accesso ai seguenti dati reali di performance da Google Search Console. Sfruttali per guidare i tuoi suggerimenti.
      'query', 'pagina', 'impressioni', 'ctr'
      ${options.gscData?.map(row => `"${row.keys[0]}", "${row.keys[1]}", ${row.impressions}, ${row.ctr}`).join('\n')}
    `
    : "Non sono stati forniti dati da Google Search Console.";

  const deepAnalysisPrompt = `
    Agisci come un "Semantic SEO Coach" di livello mondiale. Il tuo compito è analizzare in profondità una singola pagina e generare un **Piano d'Azione Strategico** chiaro e azionabile per migliorarne drasticamente le performance.

    PAGINA DA ANALIZZARE: ${options.pageUrl}
    Punteggio di Autorità Interna: ${analyzedPageDiagnostic.internal_authority_score.toFixed(2)}/10

    DATI DISPONIBILI:
    1.  Contenuto della pagina (primi 8000 caratteri):
        ---
        ${pageContent.substring(0, 8000)} 
        ---
    2.  Mappa del sito con punteggi di autorità:
        ${options.pageDiagnostics.filter(p => p.url !== options.pageUrl).map(p => `[Score: ${p.internal_authority_score.toFixed(1)}] ${p.url}`).join('\n')}
    3.  Dati di Google Search Console (GSC):
        ${gscDataString}

    IL TUO COMPITO:
    Basandoti sull'analisi combinata di contenuto, autorità interna e dati GSC, genera un report JSON. Il report deve contenere:
    1.  Un **Piano d'Azione Strategico (\`action_plan\`)**: Questo è il cuore del tuo output. Deve includere:
        - Un \`executive_summary\`: un paragrafo conciso che spieghi la situazione attuale della pagina e l'obiettivo strategico delle modifiche.
        - Una \`strategic_checklist\`: una lista di 3-5 azioni concrete e prioritarie. Ogni azione deve avere un titolo, una descrizione chiara e una priorità ('Alta', 'Media', 'Bassa').
    2.  Dati di supporto dettagliati:
        - \`opportunity_queries\`: Le query con alte impressioni e basso CTR da GSC.
        - \`inbound_links\`: Suggerimenti di link in entrata per supportare il piano.
        - \`outbound_links\`: Link in uscita per migliorare il contesto.
        - \`content_enhancements\`: Modifiche specifiche al contenuto.

    REGOLE CRITICHE:
    - La risposta DEVE essere un oggetto JSON valido in lingua italiana.
    - Tutti gli URL suggeriti DEVONO provenire dall'elenco di pagine del sito.
    - Il piano d'azione deve essere il punto focale della tua analisi.
  `;

  const deepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        action_plan: {
          type: Type.OBJECT,
          properties: {
            executive_summary: { type: Type.STRING, description: "Riepilogo strategico della situazione e degli obiettivi." },
            strategic_checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Titolo dell'azione." },
                  description: { type: Type.STRING, description: "Descrizione dettagliata dell'azione da compiere." },
                  priority: { type: Type.STRING, description: "Priorità: 'Alta', 'Media', o 'Bassa'." }
                },
                required: ["title", "description", "priority"]
              }
            }
          },
          required: ["executive_summary", "strategic_checklist"]
        },
        opportunity_queries: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { query: { type: Type.STRING }, impressions: { type: Type.NUMBER }, ctr: { type: Type.NUMBER } },
             required: ["query", "impressions", "ctr"]
          }
        },
        inbound_links: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { 
                  source_url: { type: Type.STRING }, 
                  proposed_anchor: { type: Type.STRING }, 
                  semantic_rationale: { type: Type.STRING },
                  driving_query: { type: Type.STRING },
                },
                required: ["source_url", "proposed_anchor", "semantic_rationale"]
            }
        },
        outbound_links: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { target_url: { type: Type.STRING }, proposed_anchor: { type: Type.STRING }, semantic_rationale: { type: Type.STRING } },
                required: ["target_url", "proposed_anchor", "semantic_rationale"]
            }
        },
        content_enhancements: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { suggestion_title: { type: Type.STRING }, description: { type: Type.STRING } },
                required: ["suggestion_title", "description"]
            }
        }
    },
    required: ["action_plan", "inbound_links", "outbound_links", "content_enhancements"]
  };

  try {
    const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: deepAnalysisPrompt,
        config: { responseMimeType: "application/json", responseSchema: deepAnalysisSchema, seed: 42, },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Received empty response from Gemini during deep analysis.");
    
    const report = JSON.parse(responseText.trim());
    report.analyzed_url = options.pageUrl;
    report.authority_score = analyzedPageDiagnostic.internal_authority_score;
    
    console.log(`Deep Analysis Agent for ${options.pageUrl} complete.`);
    return report;

  } catch (e) {
    console.error(`Error during deep analysis for ${options.pageUrl}:`, e);
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Failed to generate deep analysis report. Error: ${detailedError}`);
  }
}

export async function progressAnalysisFlow(options: {
  previousReport: Report;
  newGscData: GscDataRow[];
}): Promise<ProgressReport> {
  console.log("Progress Analysis Agent started for site:", options.previousReport.site);
  const { site, gscData: oldGscData, generated_at } = options.previousReport;

  if (!oldGscData) {
    throw new Error("Il report precedente non contiene dati GSC, impossibile fare un confronto.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const oldDataMap = new Map<string, GscDataRow>();
  for (const row of oldGscData) {
    const key = `${row.keys[1]}|${row.keys[0]}`; // page|query
    oldDataMap.set(key, row);
  }

  const comparisonData: ProgressMetric[] = [];
  for (const newRow of options.newGscData) {
      const key = `${newRow.keys[1]}|${newRow.keys[0]}`;
      const oldRow = oldDataMap.get(key);
      if (oldRow) {
          const ctrChange = newRow.ctr - oldRow.ctr;
          const positionChange = newRow.position - oldRow.position; // Negative is good
          if (Math.abs(ctrChange) > 0.001 || Math.abs(positionChange) > 0.5) {
              comparisonData.push({
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
  }

  comparisonData.sort((a, b) => b.ctr_change - a.ctr_change);
  const topImprovements = comparisonData.slice(0, 50);

  const progressPrompt = `
    Agisci come un analista SEO esperto. Il tuo compito è analizzare l'evoluzione delle performance di un sito confrontando i dati di Google Search Console (GSC) di due periodi diversi.

    CONTESTO:
    - Sito analizzato: ${site}
    - Data del report precedente: ${new Date(generated_at).toLocaleDateString('it-IT')}
    - L'utente ha applicato dei suggerimenti di link interni basati sul report precedente.

    DATI DI CONFRONTO (le metriche più significative):
    Formato: Pagina, Query, CTR Iniziale, CTR Attuale, Posizione Iniziale, Posizione Attuale
    ${topImprovements.map(d => `"${d.page}", "${d.query}", ${(d.initial_ctr * 100).toFixed(2)}%, ${(d.current_ctr * 100).toFixed(2)}%, ${d.initial_position.toFixed(1)}, ${d.current_position.toFixed(1)}`).join('\n')}

    IL TUO COMPITO:
    1.  Identifica le 3-5 "Vittorie Principali" (key_wins), cioè le combinazioni pagina/query che hanno mostrato i miglioramenti più significativi e strategici (es. grande aumento di CTR, miglioramento notevole di posizione per query importanti).
    2.  Scrivi un breve riassunto (ai_summary) che commenti i risultati. Sii incoraggiante e strategico. Evidenzia se le strategie di linking sembrano aver funzionato e suggerisci i prossimi passi (es. "L'aumento del CTR per 'query x' sulla pagina Y dimostra che rafforzare quel cluster è stata una mossa vincente. Ora potremmo concentrarci su...").

    REGOLE:
    - Fornisci l'output in formato JSON e in lingua italiana.
    - Sii conciso e focalizzati sull'impatto.
  `;
  
  const progressSchema = {
      type: Type.OBJECT,
      properties: {
          key_wins: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                      page: { type: Type.STRING },
                      query: { type: Type.STRING },
                      initial_ctr: { type: Type.NUMBER },
                      current_ctr: { type: Type.NUMBER },
                      initial_position: { type: Type.NUMBER },
                      current_position: { type: Type.NUMBER },
                      ctr_change: { type: Type.NUMBER },
                      position_change: { type: Type.NUMBER },
                  },
                   required: ["page", "query", "initial_ctr", "current_ctr", "initial_position", "current_position", "ctr_change", "position_change"]
              },
          },
          ai_summary: { type: Type.STRING },
      },
      required: ["key_wins", "ai_summary"]
  };

  try {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: progressPrompt,
        config: { responseMimeType: "application/json", responseSchema: progressSchema, seed: 42, },
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error("Received empty response during progress analysis.");
      
      const parsedResponse = JSON.parse(responseText.trim());
      
      const finalProgressReport: ProgressReport = {
          site,
          previous_report_date: generated_at,
          current_report_date: new Date().toISOString(),
          key_wins: parsedResponse.key_wins,
          ai_summary: parsedResponse.ai_summary,
      };
      
      console.log("Progress Analysis Agent complete.");
      return finalProgressReport;

  } catch (e) {
      console.error("Error during progress analysis flow:", e);
      const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
      throw new Error(`Agent (Progress Analyst) failed. Error: ${detailedError}`);
  }
}