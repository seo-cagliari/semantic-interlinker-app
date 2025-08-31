
import { GoogleGenAI, Type } from "@google/genai";
import { Report, ThematicCluster } from '../../types';
import { wp } from '../tools/wp';

export async function interlinkFlow(options: {
  site_root: string;
  date_range?: string;
  maxSuggestionsPerPage?: number;
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
    Genera un numero realistico di suggerimenti, tra 3 e 7.
    Il punteggio deve essere un numero decimale tra 0.5 e 0.95.

    IMPORTANTE: Fornisci tutti gli output testuali, inclusa la motivazione, in lingua italiana.
  `;

  const suggestionSchema: any = {
    type: Type.OBJECT,
    properties: {
        site: { type: Type.STRING },
        generated_at: { type: Type.STRING },
        summary: { /* Omitted for brevity, will be populated later */ },
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
      
      const finalReport: Report = {
        site: options.site_root,
        generated_at: new Date().toISOString(),
        thematic_clusters: thematicClusters,
        suggestions: suggestionData.suggestions,
        summary: {
            pages_scanned: allSiteUrls.length,
            indexable_pages: allSiteUrls.length,
            suggestions_total: suggestionData.suggestions.length,
            high_priority: suggestionData.suggestions.filter((s: any) => s.score >= 0.75).length,
        }
      };
      
      console.log("Phase 2 complete. Analysis finished.");
      return finalReport;

  } catch(e) {
      console.error("Error during Strategic Linking phase:", e);
      throw new Error("Failed to generate linking suggestions from Gemini API.");
  }
}
