import React from 'react';
import { Suggestion, Report, DeepAnalysisReport, PageDiagnostic } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { ContentGapAnalysis } from './ContentGapAnalysis';
import { DeepAnalysisReportDisplay } from './DeepAnalysisReportDisplay';
import { BrainCircuitIcon, LinkIcon, LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { OpportunityHub } from './OpportunityHub';
import { ThematicClusters } from './ThematicClusters';

interface ReportViewProps {
  report: Report;
  sortedPages: PageDiagnostic[];
  onAnalyzeFromHub: (url: string) => void;
  selectedSuggestions: Set<string>;
  onViewJson: (suggestion: Suggestion) => void;
  onViewModification: (suggestion: Suggestion) => void;
  onToggleSelection: (suggestionId: string) => void;
  selectedDeepAnalysisUrl: string;
  onSetSelectedDeepAnalysisUrl: (url: string) => void;
  onDeepAnalysis: () => void;
  isDeepLoading: boolean;
  deepError: string | null;
  deepAnalysisReport: DeepAnalysisReport | null;
}

const ReportView = ({
  report,
  sortedPages,
  onAnalyzeFromHub,
  selectedSuggestions,
  onViewJson,
  onViewModification,
  onToggleSelection,
  selectedDeepAnalysisUrl,
  onSetSelectedDeepAnalysisUrl,
  onDeepAnalysis,
  isDeepLoading,
  deepError,
  deepAnalysisReport,
}: ReportViewProps) => {
  return (
    <>
      {report.opportunity_hub && report.opportunity_hub.length > 0 && (
        <OpportunityHub pages={report.opportunity_hub} onAnalyze={onAnalyzeFromHub} />
      )}

      {report.thematic_clusters && report.thematic_clusters.length > 0 && (
        <ThematicClusters clusters={report.thematic_clusters} />
      )}
      
      {report.content_gap_suggestions && report.content_gap_suggestions.length > 0 && (
        <ContentGapAnalysis suggestions={report.content_gap_suggestions} />
      )}
      
      <div className="flex items-center gap-3 mb-4 mt-16">
        <LinkIcon className="w-8 h-8 text-slate-500" />
        <h2 className="text-2xl font-bold text-slate-800">Suggerimenti di Collegamento (Globali)</h2>
      </div>
      <div className="space-y-6">
        {(report.suggestions || []).map((suggestion, index) => (
          <div key={suggestion.suggestion_id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <SuggestionCard
              suggestion={suggestion}
              isSelected={selectedSuggestions.has(suggestion.suggestion_id)}
              onViewJson={onViewJson}
              onViewModification={onViewModification}
              onToggleSelection={onToggleSelection}
            />
          </div>
        ))}
      </div>

      <div id="deep-analysis-section" className="mt-16 bg-slate-100 p-6 rounded-2xl border border-slate-200 scroll-mt-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisi Approfondita di Pagina</h2>
        <p className="text-slate-600 mb-4">Seleziona una pagina per un'analisi dettagliata basata sui dati GSC già caricati.</p>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-600 block mb-1">Pagina da Analizzare</label>
              <select
                value={selectedDeepAnalysisUrl}
                onChange={(e) => onSetSelectedDeepAnalysisUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
              >
                {sortedPages.map(page => (
                  <option key={page.url} value={page.url}>
                    [{page.internal_authority_score.toFixed(1)}] - {page.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={onDeepAnalysis}
                disabled={isDeepLoading}
                className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                {isDeepLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <BrainCircuitIcon className="w-5 h-5" />}
                Analisi Dettagliata
              </button>
            </div>
          </div>
          {deepError &&
            <div className="mt-4 flex items-center gap-2 text-red-600">
              <XCircleIcon className="w-5 h-5" />
              <p className="text-sm">{deepError}</p>
            </div>
          }
        </div>
      </div>

      {isDeepLoading && !deepAnalysisReport && (
        <div className="text-center py-12 flex flex-col items-center">
          <LoadingSpinnerIcon className="w-12 h-12 text-slate-600 mb-4"/>
          <h3 className="text-lg font-semibold mb-2">Analisi approfondita in corso...</h2>
          <p className="text-slate-500 max-w-md">L'agente AI sta leggendo il contenuto e analizzando i dati GSC per generare suggerimenti strategici.</p>
        </div>
      )}

      {deepAnalysisReport && <DeepAnalysisReportDisplay report={deepAnalysisReport} />}
    </>
  );
};

export default ReportView;