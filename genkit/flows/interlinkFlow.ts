
import { GoogleGenAI, Type } from "@google/genai";
import { Report, Suggestion } from '../../types';
import { wp } from '../tools/wp';

// This is the real implementation of the Genkit flow using Gemini API.
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
  
  // PHASE 1 UPGRADE: Fetch all published URLs to provide context to the AI.
  console.log(`Fetching all published URLs for ${options.site_root}...`);
  const allSiteUrls = await wp.getAllPublishedUrls(options.site_root);
  console.log(`Found ${allSiteUrls.length} published URLs.`);

  if (allSiteUrls.length === 0) {
    throw new Error("Could not find any published posts or pages on the specified WordPress site. Please check the URL and site configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  // PHASE 1 UPGRADE: The prompt is now much more powerful and context-aware.
  const prompt = `
    Act as a world-class SEO expert specializing in semantic internal linking for the website "${options.site_root}".
    I have provided you with a complete list of all published URLs on this site.
    Your task is to analyze the semantic relationships between these pages and generate a list of high-impact internal linking suggestions *between them*.
    Do not suggest links to external sites or non-existent pages. All source and target URLs must come from the provided list.

    Here is the complete list of available URLs:
    ${allSiteUrls.join('\n')}

    For each suggestion, provide a source URL, a target URL, a proposed anchor text with variants, a precise insertion hint, a semantic rationale, and risk checks.
    Generate a realistic number of suggestions, between 3 and 7.
    The score should be a float between 0.5 and 0.95, reflecting the quality and semantic relevance of the suggestion.
  `;

  const responseSchema: any = {
    type: Type.OBJECT,
    properties: {
        site: { type: Type.STRING },
        generated_at: { type: Type.STRING },
        summary: {
            type: Type.OBJECT,
            properties: {
                pages_scanned: { type: Type.INTEGER },
                indexable_pages: { type: Type.INTEGER },
                suggestions_total: { type: Type.INTEGER },
                high_priority: { type: Type.INTEGER },
            },
            required: ["pages_scanned", "indexable_pages", "suggestions_total", "high_priority"]
        },
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
                            entities_in_common: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["topic_match", "entities_in_common"]
                    },
                    risk_checks: {
                        type: Type.OBJECT,
                        properties: {
                            target_status: { type: Type.INTEGER },
                            target_indexable: { type: Type.BOOLEAN },
                            canonical_ok: { type: Type.BOOLEAN },
                            dup_anchor_in_block: { type: Type.BOOLEAN }
                        },
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
    required: ["site", "generated_at", "summary", "suggestions"]
  };
  
  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
          },
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("Received an empty or invalid response from the Gemini API.");
      }
      
      const report: Report = JSON.parse(jsonText.trim());

      // Post-process to ensure data consistency
      report.site = options.site_root;
      report.generated_at = new Date().toISOString();
      // Update summary based on the new context
      report.summary.pages_scanned = allSiteUrls.length; 
      report.summary.indexable_pages = allSiteUrls.length; // Assuming all fetched URLs are indexable for now
      report.summary.suggestions_total = report.suggestions.length;
      report.summary.high_priority = report.suggestions.filter(s => s.score >= 0.75).length;
      
      return report;

  } catch(e) {
      console.error("Error calling Gemini API:", e);
      throw new Error("Failed to generate report from Gemini API.");
  }
}