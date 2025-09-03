'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suggestion, Report, ThematicCluster, DeepAnalysisReport, PageDiagnostic, GscDataRow } from '../types';
import { SuggestionCard } from '../components/SuggestionCard';
import { JsonModal } from '../components/JsonModal';
import { ModificationModal } from '../components/ModificationModal';
import { ContentGapAnalysis } from '../components/ContentGapAnalysis';
import { DeepAnalysisReportDisplay } from '../components/DeepAnalysisReportDisplay';
import { GscConnect } from '../components/GscConnect';
import { BrainCircuitIcon, DocumentTextIcon, LinkIcon, LoadingSpinnerIcon, XCircleIcon, FolderIcon, RectangleGroupIcon } from '../components/Icons';

type ViewMode = 'report' | 'visualizer';

const SiteVisualizer = dynamic(
  () => import('../components/SiteVisualizer').then(mod => mod.SiteVisualizer),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-[70vh] border border-slate-200 rounded-2xl bg-white shadow-lg">
        <div className="text-center">
          <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4"/>
          <p className="text-slate-600 font-semibold">Caricamento visualizzatore...</p>
        </div>
      </div>
    )
  }
);

const ThematicClusters: React.FC<{ clusters: ThematicCluster[] }> = ({ clusters }) => (
  <div className="mb-12">
    <div className="flex items-center gap-3 mb-4">
      <FolderIcon className="w-8 h-8 text-slate-500" />
      <h2 className="text-2xl font-bold text-slate-800">Mappa Tematica del Sito</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clusters.map((cluster, index) => (
        <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
          <h3 className="font-bold text-slate-900 mb-2">{cluster.cluster_name}</h3>
          <p className="text-sm text-slate-600 mb-4">{cluster.cluster_description}</p>
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Pagine nel cluster</h4>
            <ul className="space-y-1">
              {cluster.pages.slice(0, 5).map((page, pageIndex) => (
                <li key={pageIndex} className="text-sm text-blue-600 truncate">
                  <a href={page} target="_blank" rel="noopener noreferrer" className="hover:underline" title={page}>
                    {page.split('/').filter(Boolean).pop() || page}
                  </a>
                </li>
              ))}
              {cluster.pages.length > 5 && <li className="text-xs text-slate-400 mt-1">...e altre {cluster.pages.length - 5}</li>}
            </ul>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  
  // State for Modals
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [selectedSuggestionJson, setSelectedSuggestionJson] = useState<string>('');
  const [isModificationModalOpen, setIsModificationModalOpen] = useState<boolean>(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // State for Deep Analysis
  const [selectedDeepAnalysisUrl, setSelectedDeepAnalysisUrl] = useState<string>('');
  const [deepAnalysisReport, setDeepAnalysisReport] = useState<DeepAnalysisReport | null>(null);
  const [isDeepLoading, setIsDeepLoading] = useState<boolean>(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  
  // State for GSC data
  const [gscData, setGscData] = useState<GscDataRow[] | null>(null);

  // State for the new auth flow
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    // Clean the URL immediately
    if (code || errorParam) {
        const newPath = window.location.pathname;
        window.history.replaceState({}, '', newPath);
    }
    
    if (errorParam) {
        setError(errorParam);
        return;
    }

    if (code) {
        setIsExchangingCode(true);
        setError(null);

        const exchangeCodeForToken = async (authCode: string) => {
            try {
                const response = await fetch('/api/gsc/exchange-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: authCode }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || errorData.error || 'Failed to exchange code for token.');
                }
                
                // Success! The cookie is set. isExchangingCode will be set to false,
                // which will trigger GscConnect to re-check auth status.
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred during authentication.');
            } finally {
                setIsExchangingCode(false);
            }
        };
        exchangeCodeForToken(code);
    }
  }, [searchParams, router]);


  const handleStartAnalysis = useCallback(async (siteUrl: string, gscDataPayload: GscDataRow[]) => {
    setIsLoading(true);
    setReport(null);
    setError(null);
    setDeepAnalysisReport(null);
    setDeepError(null);
    setSelectedDeepAnalysisUrl('');
    setSelectedSuggestions(new Set());
    setViewMode('report');
    setGscData(gscDataPayload);

    try {
        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            site_root: siteUrl, 
            gscData: gscDataPayload
          })
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
            throw new Error(errorData.details || `Server responded with status ${apiResponse.status}`);
        }
        
        const responseData: Report = await apiResponse.json();
        setReport(responseData);
        if (responseData.page_diagnostics && responseData.page_diagnostics.length > 0) {
            const sortedPages = [...responseData.page_diagnostics].sort((a, b) => b.internal_authority_score - a.internal_authority_score);
            setSelectedDeepAnalysisUrl(sortedPages[0].url);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleDeepAnalysis = useCallback(async () => {
    if (!selectedDeepAnalysisUrl || !report?.page_diagnostics) {
      setDeepError("Seleziona una pagina da analizzare.");
      return;
    }
    setIsDeepLoading(true);
    setDeepAnalysisReport(null);
    setDeepError(null);

    try {
      const apiResponse = await fetch('/api/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: selectedDeepAnalysisUrl,
          pageDiagnostics: report.page_diagnostics,
          gscData: gscData // Use the stored GSC data
        })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
        throw new Error(errorData.details || `Server responded with status ${apiResponse.status}`);
      }
      
      const responseData: DeepAnalysisReport = await apiResponse.json();
      setDeepAnalysisReport(responseData);

    } catch (err) {
      setDeepError(err instanceof Error ? err.message : "An unknown error occurred during deep analysis.");
    } finally {
      setIsDeepLoading(false);
    }
  }, [selectedDeepAnalysisUrl, report?.page_diagnostics, gscData]);
  
  const handleViewJson = useCallback((suggestion: Suggestion) => {
    setSelectedSuggestionJson(JSON.stringify(suggestion, null, 2));
    setIsJsonModalOpen(true);
  }, []);

  const handleViewModification = useCallback((suggestion: Suggestion) => {
    setCurrentSuggestion(suggestion);
    setIsModificationModalOpen(true);
  }, []);

  const handleToggleSelection = useCallback((suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  }, []);

  const renderSummaryAndActions = () => {
    if (!report) return null;
    return (
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-3xl font-bold text-slate-800">Report Strategico</h2>
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
    );
  };
  
  const renderDeepAnalysisSection = () => {
    if (!report) return null;
    return (
      <div className="mt-16 bg-slate-100 p-6 rounded-2xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisi Approfondita di Pagina</h2>
        <p className="text-slate-600 mb-4">Seleziona una pagina per un'analisi dettagliata basata sui dati GSC già caricati.</p>
        <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-600 block mb-1">Pagina da Analizzare</label>
                  <select
                      value={selectedDeepAnalysisUrl}
                      onChange={(e) => setSelectedDeepAnalysisUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  >
                      {report.page_diagnostics.sort((a,b) => b.internal_authority_score - a.internal_authority_score).map(page => 
                          <option key={page.url} value={page.url}>
                          [{page.internal_authority_score.toFixed(1)}] - {page.title}
                          </option>
                      )}
                  </select>
              </div>
              <div>
                  <button
                      onClick={handleDeepAnalysis}
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
    )
  }

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800">
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <div className="flex justify-center items-center gap-4">
            <BrainCircuitIcon className="w-12 h-12 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold">Semantic-Interlinker-25</h1>
              <p className="text-slate-500 mt-1">Suggerimenti di Link Interni basati su AI per WordPress</p>
            </div>
          </div>
        </header>

        <main>
          {!report && !isLoading && !error && (
            <GscConnect onAnalysisStart={handleStartAnalysis} isExchangingCode={isExchangingCode} />
          )}

          {isLoading && (
             <div className="text-center py-16 flex flex-col items-center">
                <LoadingSpinnerIcon className="w-16 h-16 text-blue-600 mb-4"/>
                <h2 className="text-xl font-semibold mb-2">Analisi strategica in corso...</h2>
                <p className="text-slate-500 max-w-md">Sto interrogando i tuoi dati GSC e analizzando il sito per orchestrare gli agenti AI. Potrebbe richiedere un momento...</p>
             </div>
          )}

          {error && (
            <div className="text-center py-12 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-red-200">
              <XCircleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Si è verificato un errore</h2>
              <p className="text-slate-600 mb-4 whitespace-pre-wrap">{error}</p>
              <button onClick={() => { setError(null); }} className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors">
                  Riprova
              </button>
            </div>
          )}

          {report && (
            <div className="animate-fade-in-up">
              {renderSummaryAndActions()}

              {viewMode === 'visualizer' ? (
                <SiteVisualizer report={report} />
              ) : (
                <>
                  {report.thematic_clusters && <ThematicClusters clusters={report.thematic_clusters} />}
                  
                  {report.content_gap_suggestions && report.content_gap_suggestions.length > 0 && (
                    <ContentGapAnalysis suggestions={report.content_gap_suggestions} />
                  )}
                  
                  <div className="flex items-center gap-3 mb-4 mt-16">
                    <LinkIcon className="w-8 h-8 text-slate-500" />
                    <h2 className="text-2xl font-bold text-slate-800">Suggerimenti di Collegamento (Globali)</h2>
                  </div>
                  <div className="space-y-6">
                    {report.suggestions.map((suggestion, index) => (
                      <div key={suggestion.suggestion_id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                        <SuggestionCard
                          suggestion={suggestion}
                          isSelected={selectedSuggestions.has(suggestion.suggestion_id)}
                          onViewJson={handleViewJson}
                          onViewModification={handleViewModification}
                          onToggleSelection={handleToggleSelection}
                        />
                      </div>
                    ))}
                  </div>

                  {renderDeepAnalysisSection()}

                  {isDeepLoading && !deepAnalysisReport && (
                    <div className="text-center py-12 flex flex-col items-center">
                      <LoadingSpinnerIcon className="w-12 h-12 text-slate-600 mb-4"/>
                      <h3 className="text-lg font-semibold mb-2">Analisi approfondita in corso...</h3>
                      <p className="text-slate-500 max-w-md">L'agente AI sta leggendo il contenuto e analizzando i dati GSC per generare suggerimenti strategici.</p>
                    </div>
                  )}

                  {deepAnalysisReport && <DeepAnalysisReportDisplay report={deepAnalysisReport} />}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <JsonModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        jsonString={selectedSuggestionJson}
      />
      <ModificationModal 
        isOpen={isModificationModalOpen}
        onClose={() => setIsModificationModalOpen(false)}
        suggestion={currentSuggestion}
      />
    </div>
  );
};


const App: React.FC = () => (
    <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinnerIcon className="w-16 h-16 text-blue-600"/>
        </div>
    }>
        <AppContent />
    </React.Suspense>
);


export default App;