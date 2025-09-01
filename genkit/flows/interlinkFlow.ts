import { GoogleGenAI, Type } from "@google/genai";
import { Report, ThematicCluster, ContentGapSuggestion, DeepAnalysisReport, PageDiagnostic, GscDataRow, Suggestion } from '../../types';
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
  gscData?: GscDataRow[];
  applyDraft: boolean;
}): Promise<Report> {
  console.log("Master Agent started with options:", options);
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


  // PHASE 0: AUTHORITY CALCULATION
  console.log("Master Agent - Phase 0: Authority Calculation...");
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
  console.log(`Master Agent - Phase 0 complete. Calculated authority for ${pageDiagnostics.length} pages.`);

  const allSiteUrls = pageDiagnostics.map(p => p.url);
  if (allSiteUrls.length === 0) {
    throw new Error("Could not find any published posts or pages on the specified WordPress site.");
  }

  // --- AGENT 1: INFORMATION ARCHITECT ---
  console.log("Master Agent deploying Agent 1: Information Architect...");
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
    const clusterResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: clusterPrompt,
        config: { responseMimeType: "application/json", responseSchema: clusterSchema, seed: 42 },
    });
    const responseText = clusterResponse.text;
    if (!responseText) throw new Error("Received empty response during clustering.");
    thematicClusters = JSON.parse(responseText.trim()).thematic_clusters;
    console.log(`Agent 1 complete. Identified ${thematicClusters.length} thematic clusters.`);
  } catch (e) {
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Agent 1 (Information Architect) failed. Error: ${detailedError}`);
  }

  // --- AGENT 2: SEMANTIC LINKING STRATEGIST ---
  console.log("Master Agent deploying Agent 2: Semantic Linking Strategist...");
  const suggestionPrompt = `
    Agisci come un esperto SEO di livello mondiale specializzato in internal linking semantico per "${options.site_root}".
    
    CONTESTO:
    1. La struttura del sito è stata organizzata nei seguenti cluster tematici:
    ${JSON.stringify(thematicClusters, null, 2)}
    
    2. Hai accesso ai dati di performance di Google Search Console:
    ${gscDataStringForPrompt}

    IL TUO COMPITO:
    Genera un elenco di 10 suggerimenti di link interni ad alto impatto.

    ISTRUZIONI STRATEGICHE:
    - IDENTIFICA LE "QUERY OPPORTUNITÀ": Cerca nei dati GSC le query con alte impressioni ma basso CTR.
    - DAI PRIORITÀ AI LINK DATA-DRIVEN: I tuoi suggerimenti migliori dovrebbero aiutare le pagine a posizionarsi meglio per queste "query opportunità".
    - RAFFORZA I CLUSTER: Suggerisci link che rinforzino la coerenza dei cluster tematici.
    - Fornisci tutti gli output testuali, inclusa la motivazione, in lingua italiana e rispetta lo schema JSON.
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
              },
            },
            risk_checks: {
              type: Type.OBJECT,
              properties: {
                target_status: { type: Type.INTEGER },
                target_indexable: { type: Type.BOOLEAN },
                canonical_ok: { type: Type.BOOLEAN },
                dup_anchor_in_block: { type: Type.BOOLEAN },
              },
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
     const suggestionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: suggestionPrompt,
        config: { responseMimeType: "application/json", responseSchema: suggestionSchema, seed: 42 },
    });
    const responseText = suggestionResponse.text;
    if (responseText) {
        reportSuggestions = JSON.parse(responseText.trim()).suggestions;
    }
      console.log(`Agent 2 complete. Generated ${reportSuggestions.length} linking suggestions.`);
  } catch(e) {
      console.error("Error during Strategic Linking phase:", e);
      throw new Error("Agent 2 (Semantic Linking Strategist) failed.");
  }

  // --- AGENT 3: CONTENT STRATEGIST ---
  console.log("Master Agent deploying Agent 3: Content Strategist...");
  const contentGapPrompt = `
    Agisci come un SEO Content Strategist di livello mondiale per "${options.site_root}".

    CONTESTO:
    1. Cluster tematici del sito:
    ${JSON.stringify(thematicClusters.map(c => ({ name: c.cluster_name, description: c.cluster_description })), null, 2)}

    2. Dati di performance da Google Search Console:
    ${gscDataStringForPrompt}

    IL TUO COMPITO:
    Identifica le lacune di contenuto strategiche.

    ISTRUZIONI STRATEGICHE:
    - ANALIZZA LE QUERY DEBOLI: Cerca nei dati GSC le query per cui il sito ha visibilità (impressioni) ma scarso engagement (basso CTR) o per le quali nessuna pagina risponde in modo soddisfacente.
    - SUGGERISCI CONTENUTI MIRATI: Proponi 3-5 nuovi articoli che rispondano direttamente a queste query deboli, per colmare le lacune di performance e aumentare l'autorità.
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
                    relevant_cluster: { type: Type.STRING }
                }
            }
        }
    }
  };

  let contentGapSuggestions: ContentGapSuggestion[] = [];
  try {
      const contentGapResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contentGapPrompt,
        config: { responseMimeType: "application/json", responseSchema: contentGapSchema, seed: 42 },
    });
    const responseText = contentGapResponse.text;
    if (responseText) {
        contentGapSuggestions = JSON.parse(responseText.trim()).content_gap_suggestions;
    }
      console.log(`Agent 3 complete. Identified ${contentGapSuggestions.length} content opportunities.`);
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
    internal_links_map: internalLinksMap,
    summary: {
        pages_scanned: allSiteUrls.length,
        indexable_pages: allSiteUrls.length,
        suggestions_total: reportSuggestions.length,
        high_priority: reportSuggestions.filter((s: any) => s.score >= 0.75).length,
    }
  };
  
  console.log("Master Agent finished. Returning final report.");
  return finalReport;
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
    Agisci come un SEO Strategist di livello mondiale, esperto nell'uso dei dati per guidare le decisioni. Il tuo compito è analizzare in profondità una singola pagina per ottimizzare la sua rete di link interni e il suo contenuto.

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
    Basandoti sull'analisi combinata di contenuto, autorità interna e dati GSC, genera un report JSON.

    ISTRUZIONI STRATEGICHE:
    - IDENTIFICA LE "QUERY OPPORTUNITÀ": Cerca nei dati GSC le query con alte impressioni ma basso CTR relative alla pagina analizzata. Queste sono le tue priorità.
    - LINK IN ENTRATA (inbound_links):
        - Se hai dati GSC, trova altre pagine del sito che rankano per query simili o correlate alle "query opportunità". Suggerisci link DA queste pagine, usando le "query opportunità" come anchor text.
        - In assenza di dati GSC, suggerisci link da pagine con ALTA autorità interna per potenziare la pagina analizzata.
        - Per ogni suggerimento, includi il campo 'driving_query' se è basato su dati GSC.
    - LINK IN USCITA (outbound_links): Suggerisci link da questa pagina verso altre pagine rilevanti per arricchire il contesto e distribuire autorità.
    - MIGLIORAMENTI DEL CONTENUTO (content_enhancements): Suggerisci modifiche al testo che incorporino le "query opportunità" o che migliorino la risposta all'intento di ricerca.

    REGOLE CRITICHE:
    - La risposta DEVE essere un oggetto JSON valido in lingua italiana.
    - Tutti gli URL suggeriti DEVONO provenire dall'elenco di pagine del sito.
  `;

  const deepAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
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
    
    console.log(`Deep Analysis Agent for ${options.pageUrl} complete.`);
    return report;

  } catch (e) {
    console.error(`Error during deep analysis for ${options.pageUrl}:`, e);
    const detailedError = e instanceof Error ? e.message : JSON.stringify(e);
    throw new Error(`Failed to generate deep analysis report. Error: ${detailedError}`);
  }
}