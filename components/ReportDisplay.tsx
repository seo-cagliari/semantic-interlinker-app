import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Suggestion, Report, ThematicCluster, DeepAnalysisReport, PageDiagnostic, SavedReport, ProgressReport } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { JsonModal } from './JsonModal';
import { ModificationModal } from './ModificationModal';
import { ContentGapAnalysis } from './ContentGapAnalysis';
import { DeepAnalysisReportDisplay } from './DeepAnalysisReportDisplay';
import { BrainCircuitIcon, DocumentTextIcon, LinkIcon, LoadingSpinnerIcon, XCircleIcon, FolderIcon, RectangleGroupIcon, ArrowPathIcon, ClockIcon } from './Icons';
import { ProgressReportModal } from './ProgressReportModal';
import { OpportunityHub } from './OpportunityHub';

const SiteVisualizerSkeleton = () => (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-lg relative h-[70vh] flex items-center justify-center animate-fade-in-up">
        <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Caricamento visualizzatore...</p>
            <p className="text-slate-500 text-sm mt-1">L'architettura del sito è in fase di rendering.</p>
        </div>
    </div>
);

const SiteVisualizer = dynamic(
  () => import('./SiteVisualizer').then(mod => mod.SiteVisualizer),
  { 
    ssr: false,
    loading: () => <SiteVisualizerSkeleton />
  }
);

type ViewMode = 'report' | 'visualizer';

const ThematicClusters: React.FC<{ clusters: ThematicCluster[] }> = ({ clusters }) => (
  <div className="my-16">
    <div className="flex items-center gap-3 mb-4">
      <FolderIcon className="w-8 h-8 text-slate-500" />
      <h2 className="text-2xl font-bold text-slate-800">Mappa Tematica del Sito</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(clusters || []).map((cluster, index) => (
        <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
          <h3 className="font-bold text-slate-900 mb-2">{cluster.cluster_name}</h3>
          <p className="text-sm text-slate-600 mb-4">{cluster.cluster_description}</p>
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Pagine nel cluster</h4>
            <ul className="space-y-1">
              {(cluster.pages || []).slice(0, 5).map((page, pageIndex) => (
                <li key={pageIndex} className="text-sm text-blue-600 truncate">
                  <a href={page} target="_blank" rel="noopener noreferrer" className="hover:underline" title={page}>
                    {page.split('/').filter(Boolean).pop() || page}
                  </a>
                </li>
              ))}
              {cluster.pages && cluster.pages.length > 5 && <li className="text-xs text-slate-400 mt-1">...e altre {cluster.pages.length - 5}</li>}
            </ul>
          </div>
        </div>
      ))}
    </div>
  </div>
);


interface ReportDisplayProps {
  report: Report;
  savedReport: SavedReport | null;
  isProgressLoading: boolean;
  onProgressCheck: () => void;
  onNewAnalysis: () => void;
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

const ReportDisplay: React.FC<ReportDisplayProps> = ({
  report,
  savedReport,
  isProgressLoading,
  onProgressCheck,
  onNewAnalysis,
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
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  
  const sortedPageDiagnostics = useMemo(() => {
    if (!report?.page_diagnostics) return [];
    return [...report.page_diagnostics].sort((a, b) => b.internal_authority_score - a.internal_authority_score);
  }, [report?.page_diagnostics]);

  return (
    <div className="animate-fade-in-up">
      <div className="mb-10">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-3xl font-bold text-slate-800">Report Strategico</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(prev => prev === 'report' ? 'visualizer' : 'report')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {viewMode === 'report' ? (
                <>
                  <RectangleGroupIcon className="w-5 h-5"/>
                  Visualizza Architettura
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5"/>
                  Visualizza Report
                </>
              )}
            </button>
            <button
                onClick={onNewAnalysis}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <ArrowPathIcon className="w-5 h-5" />
                Nuova Analisi
            </button>
            {savedReport && (
                <button
                    onClick={onProgressCheck}
                    disabled={isProgressLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                    {isProgressLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                    Controlla Progresso
                </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Pagine Scansite</p>
            <p className="text-2xl font-bold text-slate-800">{report.summary.pages_scanned}</p>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Pagine Indicizzabili</p>
            <p className="text-2xl font-bold text-slate-800">{report.summary.indexable_pages}</p>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Suggerimenti</p>
            <p className="text-2xl font-bold text-slate-800">{report.summary.suggestions_total}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-sm text-green-600">Priorità Alta</p>
            <p className="text-2xl font-bold text-green-800">{report.summary.high_priority}</p>
          </div>
        </div>
      </div>

      {viewMode === 'visualizer' ? (
        <SiteVisualizer report={report} />
      ) : (
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
                    {sortedPageDiagnostics.map(page => (
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
      )}
    </div>
  );
};

export default ReportDisplay;
