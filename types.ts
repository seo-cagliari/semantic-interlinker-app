export type RiskChecks = {
  target_status: number;
  target_indexable: boolean;
  canonical_ok: boolean;
  dup_anchor_in_block: boolean;
  potential_cannibalization?: boolean;
  cannibalization_details?: {
    competing_queries: string[];
    remediation_steps: string[];
  };
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
    intent_alignment_comment?: string;
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

export type ContentGapSuggestion = {
  title: string;
  description: string;
  relevant_cluster: string;
  target_query?: string;
  search_volume?: number;
  keyword_difficulty?: number;
  search_intent?: string;
};

// --- Tipi per l'integrazione GSC ---
export type GscSite = {
  siteUrl: string;
  permissionLevel: string;
};

export type GscDataRow = {
  keys: string[]; // [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

// --- Tipi per l'Analisi Approfondita con il Sotto-Agente SEO ---

export type ActionStep = {
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Bassa';
};

export type StrategicActionPlan = {
  executive_summary: string;
  strategic_checklist: ActionStep[];
};

export type InboundLinkSuggestion = {
  source_url: string;
  proposed_anchor: string;
  semantic_rationale: string;
  driving_query?: string; // Query GSC che ha motivato il suggerimento
};

export type OutboundLinkSuggestion = {
  target_url: string;
  proposed_anchor: string;
  semantic_rationale: string;
};

export type ContentEnhancementSuggestion = {
  suggestion_title: string;
  description: string;
};

export type DeepAnalysisReport = {
  analyzed_url: string;
  authority_score: number;
  action_plan: StrategicActionPlan; // Il nuovo piano strategico
  inbound_links: InboundLinkSuggestion[];
  outbound_links: OutboundLinkSuggestion[];
  content_enhancements: ContentEnhancementSuggestion[];
  opportunity_queries?: { query: string; impressions: number; ctr: number }[];
};

// --- Tipo per la diagnostica della pagina e l'autorità ---
export type PageDiagnostic = {
  url: string;
  title: string;
  internal_authority_score: number; // Score from 0 to 10
};

// --- Tipi per il Content Performance & Opportunity Hub ---
export type OpportunityPage = {
  url: string;
  title: string;
  opportunity_score: number;
  total_impressions: number;
  average_ctr: number;
};

// --- Tipi per l'Analisi dei Progressi ---

export type ProgressMetric = {
  page: string;
  query: string;
  initial_ctr: number;
  current_ctr: number;
  initial_position: number;
  current_position: number;
  ctr_change: number; // in percentage points
  position_change: number; // e.g., -2 means improved by 2 positions
};

export type ProgressReport = {
  site: string;
  previous_report_date: string;
  current_report_date: string;
  key_wins: ProgressMetric[];
  ai_summary: string;
};

export type SavedReport = {
  report: Report;
  timestamp: number;
};

// --- Tipo principale del Report ---

export type Report = {
  site: string;
  gscSiteUrl?: string; // The original GSC property URL (e.g., sc-domain:...)
  generated_at: string;
  summary: ReportSummary;
  thematic_clusters: ThematicCluster[];
  suggestions: Suggestion[];
  content_gap_suggestions: ContentGapSuggestion[];
  page_diagnostics: PageDiagnostic[];
  opportunity_hub?: OpportunityPage[];
  internal_links_map: Record<string, string[]>; // Mappa dei link per il visualizer
  gscData?: GscDataRow[];
  notes?: string;
};