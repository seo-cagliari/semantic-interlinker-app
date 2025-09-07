import React, { useState } from 'react';
import { Report, DeepAnalysisReport, PageDiagnostic, SavedReport, Suggestion } from '../types';
import VisualizerView from './VisualizerView';
import { ReportView } from './ReportView';
import { DocumentTextIcon, RectangleGroupIcon, ArrowPathIcon, ClockIcon, LoadingSpinnerIcon, LinkIcon, LightBulbIcon, BeakerIcon, LayoutDashboardIcon, XCircleIcon, BrainCircuitIcon, MapIcon } from './Icons';
import { Filters } from './SuggestionFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { OpportunityHub } from './OpportunityHub';
import { ThematicClusters } from './ThematicClusters';
import { ContentGapAnalysis } from './ContentGapAnalysis';
import { DeepAnalysisReportDisplay } from './DeepAnalysisReportDisplay';
import { TopicalAuthorityRoadmap, TopicalAuthorityGenerator } from './TopicalAuthorityRoadmap';

type ViewMode = 'report' | 'visualizer';

interface ReportDisplayProps {
  report: Report;
  sortedPages: PageDiagnostic[];
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
  filters: Filters;
  onFiltersChange: (newFilters: Filters) => void;
  onGenerateTopicalAuthority: (mainTopic: string, serpApiKey: string) => void;
  isTopicalAuthorityLoading: boolean;
  topicalAuthorityError: string | null;
  topicalAuthorityLoadingMessage: string;
  initialSerpApiKey: string;
  onGenerateContentStrategy: () => void;
  isContentStrategyLoading: boolean;
  contentStrategyError: string | null;
  contentStrategyLoadingMessage: string;
}

export const ReportDisplay = (props: ReportDisplayProps) => {
  const { 
      report, 
      onNewAnalysis, 
      savedReport, 
      isProgressLoading, 
      onProgressCheck,
      sortedPages,
      onAnalyzeFromHub,
      selectedDeepAnalysisUrl,
      onSetSelectedDeepAnalysisUrl,
      onDeepAnalysis,
      isDeepLoading,
      deepError,
      deepAnalysisReport,
      onGenerateTopicalAuthority,
      isTopicalAuthorityLoading,
      topicalAuthorityError,
      topicalAuthorityLoadingMessage,
      initialSerpApiKey,
      onGenerateContentStrategy,
      isContentStrategyLoading,
      contentStrategyError,
      contentStrategyLoadingMessage
  } = props;
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  
  const renderDeepAnalysisSection = () => (
     <div id="deep-analysis-section" className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200 scroll-mt-4">
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

          {isDeepLoading && !deepAnalysisReport && (
              <div className="text-center py-12 flex flex-col items-center">
              <LoadingSpinnerIcon className="w-12 h-12 text-slate-600 mb-4"/>
              <h3 className="text-lg font-semibold mb-2">Analisi approfondita in corso...</h3>
              <p className="text-slate-500 max-w-md">L'agente AI sta leggendo il contenuto e analizzando i dati GSC per generare suggerimenti strategici.</p>
              </div>
          )}

          {deepAnalysisReport && <DeepAnalysisReportDisplay report={deepAnalysisReport} />}
      </div>
  );

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

      {viewMode === 'report' ? (
        <Tabs defaultValue="summary">
            <TabsList>
                <TabsTrigger value="summary" icon={<LayoutDashboardIcon className="w-5 h-5" />}>Riepilogo Strategico</TabsTrigger>
                <TabsTrigger value="suggestions" icon={<LinkIcon className="w-5 h-5" />}>Suggerimenti di Link</TabsTrigger>
                <TabsTrigger value="topical_authority" icon={<MapIcon className="w-5 h-5" />}>Topical Authority</TabsTrigger>
                <TabsTrigger value="content" icon={<LightBulbIcon className="w-5 h-5" />}>Analisi Contenuti</TabsTrigger>
                <TabsTrigger value="deep-dive" icon={<BeakerIcon className="w-5 h-5" />}>Analisi Approfondita</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              {report.opportunity_hub && report.opportunity_hub.length > 0 ? (
                  <OpportunityHub pages={report.opportunity_hub} onAnalyze={onAnalyzeFromHub} />
              ) : (
                 <p className="text-center py-12 text-slate-500">Nessun dato disponibile per l'Opportunity Hub.</p>
              )}
            </TabsContent>
            
            <TabsContent value="suggestions">
                <ReportView {...props} />
            </TabsContent>

            <TabsContent value="topical_authority">
                {report.topical_authority_roadmap ? (
                    <TopicalAuthorityRoadmap roadmap={report.topical_authority_roadmap} />
                ) : (
                   <TopicalAuthorityGenerator
                        onGenerate={onGenerateTopicalAuthority}
                        isLoading={isTopicalAuthorityLoading}
                        error={topicalAuthorityError}
                        loadingMessage={topicalAuthorityLoadingMessage}
                        initialApiKey={initialSerpApiKey}
                   />
                )}
            </TabsContent>

            <TabsContent value="content">
                 {report.thematic_clusters && report.thematic_clusters.length > 0 ? (
                    <ThematicClusters clusters={report.thematic_clusters} />
                ) : (
                    <p className="text-center py-12 text-slate-500">Nessun cluster tematico generato.</p>
                )}
                {report.content_gap_suggestions && report.content_gap_suggestions.length > 0 ? (
                    <ContentGapAnalysis suggestions={report.content_gap_suggestions} />
                ) : (
                    <div className="mt-16 text-center py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200">
                        <LightBulbIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                        <h3 className="text-xl font-bold text-slate-800">Scopri le tue Opportunità di Contenuto</h3>
                        <p className="max-w-xl mx-auto text-slate-600 mt-2 mb-6">
                            Avvia un'analisi dedicata per identificare le lacune strategiche nei tuoi contenuti. L'AI analizzerà i dati di performance per suggerire nuovi articoli mirati a catturare traffico qualificato.
                        </p>
                        {!isContentStrategyLoading ? (
                            <button 
                                onClick={onGenerateContentStrategy}
                                className="bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <BrainCircuitIcon className="w-5 h-5" />
                                Genera Opportunità di Contenuto
                            </button>
                        ) : (
                            <div className="flex flex-col items-center">
                                <LoadingSpinnerIcon className="w-8 h-8 text-blue-600 mb-3" />
                                <p className="text-slate-500 font-semibold animate-fade-in-up" key={contentStrategyLoadingMessage}>
                                    {contentStrategyLoadingMessage}
                                </p>
                            </div>
                        )}
                        {contentStrategyError && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
                                <XCircleIcon className="w-5 h-5" />
                                <p className="text-sm">{contentStrategyError}</p>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="deep-dive">
                {renderDeepAnalysisSection()}
            </TabsContent>
        </Tabs>
      ) : (
        <VisualizerView report={report} />
      )}
    </div>
  );
};