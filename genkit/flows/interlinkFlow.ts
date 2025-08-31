

import { GoogleGenAI, Type } from "@google/genai";
import { Report, ThematicCluster, ContentGapSuggestion } from '../../types';
import { wp } from '../tools/wp';

export async function interlinkFlow(options: {
  site_root: string;
  date_range?: string;
  maxSuggestions?: number;
  scoreThreshold?: number;
  applyDraft: boolean;
}): Promise<Report> {
  console.log("Real interlinkFlow triggered with options:", options);

  if (!options.site_root) {
      throw new Error("site_root is required for analysis.");
  }
  
  console.log(`Fetching all published URLs for ${options.site_root}...`);
  const allSiteUrls = await wp.getAllPublishedUrls(options.site_root);
  console.log(`Found ${allSiteUrls.length} published URLs.`);

  if (allSiteUrls.length === 0) {
    throw new Error("Could not find any published posts or pages on the specified WordPress site. Please check the URL and site configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // PHASE 1: THEMATIC CLUSTERING
  console.log("Starting Phase 1: Thematic Clustering...");
  const clusterPrompt = `
    Agisci come un architetto dell'informazione e un esperto SEO. Ti ho fornito un elenco completo di tutti gli URL pubblicati sul sito "${options.site_root}".
    Il tuo primo compito è analizzare questo elenco e raggruppare gli URL in cluster tematici.
    Per ogni cluster, fornisci un nome conciso e una breve descrizione (massimo 15 parole) che ne riassuma l'argomento principale.
    Ignora le pagine generiche come "contatti" o "privacy policy" a meno che non siano centrali per il sito.
    Crea tra 3 e 6 cluster significativi.

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
        config: {
            responseMimeType: "application/json",
            responseSchema: clusterSchema,
            seed: 42,
        },
    });

    const responseText = clusterResponse.text;
    if (!responseText) {
        throw new Error("Received an empty text response from Gemini during thematic clustering.");
    }

    const clusterJson = JSON.parse(responseText.trim());
    thematicClusters = clusterJson.thematic_clusters;
    console.log(`Phase 1 complete. Identified ${thematicClusters.length} thematic clusters.`);
  } catch (e) {
    console.error("Error during Thematic Clustering phase:", e);
    throw new Error("Failed to generate thematic clusters from Gemini API.");
  }

  // PHASE 2: STRATEGIC LINKING
  console.log("Starting Phase 2: Strategic Linking...");
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
                        required: ["block_type", "position_hint", "reason"]
                    },
                    semantic_rationale: {
                        type: Type.OBJECT,
                        properties: { topic_match: { type: Type.STRING }, entities_in_common: { type: Type.ARRAY, items: { type: Type.STRING } } },
                        required: ["topic_match", "entities_in_common"]
                    },
                    risk_checks: {
                        type: Type.OBJECT,
                        properties: { target_status: { type: Type.INTEGER }, target_indexable: { type: Type.BOOLEAN }, canonical_ok: { type: Type.BOOLEAN }, dup_anchor_in_block: { type: Type.BOOLEAN } },
                         required: ["target_status", "target_indexable", "canonical_ok", "dup_anchor_in_block"]
                    },
                    score: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                    apply_mode: { type: Type.STRING }
                },
                 required: ["suggestion_id", "source_url", "target_url", "proposed_anchor", "anchor_variants", "insertion_hint", "semantic_rationale", "risk_checks", "score", "apply_mode"]
            }
        }
    },
    required: ["suggestions"]
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
  console.log("Starting Phase 3: Content Gap Analysis...");
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
          required: ["title", "description", "relevant_cluster"]
        }
      }
    },
    required: ["content_gap_suggestions"]
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
      } else {
          console.warn("Received an empty response during content gap analysis. Skipping.");
      }
  } catch(e) {
      console.error("Error during Content Gap Analysis phase:", e);
      // Non bloccare l'intero report se questa fase fallisce
  }
  
  const finalReport: Report = {
    site: options.site_root,
    generated_at: new Date().toISOString(),
    thematic_clusters: thematicClusters,
    suggestions: reportSuggestions,
    content_gap_suggestions: contentGapSuggestions,
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