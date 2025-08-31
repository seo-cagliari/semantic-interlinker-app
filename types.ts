
export type RiskChecks = {
  target_status: number;
  target_indexable: boolean;
  canonical_ok: boolean;
  dup_anchor_in_block: boolean;
};

export type InsertionHint = {
  block_type: "paragraph" | "list" | "after_h2" | "after_h3";
  position_hint: string;
  reason: string;
};

export type Suggestion = {
  suggestion_id: string;
  source_url: string;
  target_url: string;
  proposed_anchor: string;
  anchor_variants: string[];
  insertion_hint: InsertionHint;
  semantic_rationale: {
    topic_match: string;
    entities_in_common: string[];
  };
  risk_checks: RiskChecks;
  score: number;
  notes?: string;
  apply_mode: "draft_patch";
};

export type ReportSummary = {
  pages_scanned: number;
  indexable_pages: number;
  suggestions_total: number;
  high_priority: number;
};

export type PageEntry = {
  url: string;
  title: string;
};

export type ThematicCluster = {
  cluster_name: string;
  cluster_description: string;
  pages: string[];
};

export type Report = {
  site: string;
  generated_at: string;
  summary: ReportSummary;
  thematic_clusters: ThematicCluster[];
  suggestions: Suggestion[];
  notes?: string;
};