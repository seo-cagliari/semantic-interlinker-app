'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Suggestion, Report, GscDataRow, SavedReport, ProgressReport, DeepAnalysisReport, Ga4DataRow, ThematicCluster, TopicalAuthorityRoadmap, ContentGapSuggestion } from '../types';
import { JsonModal } from './JsonModal';
import { ModificationModal } from './ModificationModal';
import { LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { ReportDisplay } from './ReportDisplay';
import { GscConnect } from './GscConnect';
import { Filters } from './SuggestionFilters';
import { ProgressDashboard } from './ProgressDashboard';

const SEOZOOM_API_KEY_STORAGE_KEY = 'semantic-interlinker-seozoom-api-key';
const SERP_API_KEY_STORAGE_KEY = 'semantic-interlinker-serp-api-key';


type View = 'connect' | 'loading' | 'report' | 'progress';

interface AnalysisPayload {
    siteUrl: string;
    gscData: GscDataRow[];
    gscSiteUrl: string;
    ga4Data?: Ga4DataRow[];
    strategyOptions?: { strategy: 'global' | 'pillar' | 'money'; targetUrls: string[] };
}

export default function DashboardClient() {
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const [site, setSite] = useState<string | null>(null);
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [seozoomApiKey, setSeozoomApiKey] = useState<string>('');
  const [serpApiKey, setSerpApiKey] = useState<string>('');
  
  const [view, setView] = useState<View>('connect');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [selectedSuggestionJson, setSelectedSuggestionJson] = useState<string>('');
  const [isModificationModalOpen, setIsModificationModalOpen] = useState<boolean>(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({ minScore: 0, cluster: 'all', risk: 'all' });
  
  const [selectedDeepAnalysisUrl, setSelectedDeepAnalysisUrl] = useState<string>('');
  const [deepAnalysisReport, setDeepAnalysisReport] = useState<DeepAnalysisReport | null>(null);
  const [isDeepLoading, setIsDeepLoading] = useState<boolean>(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  
  const [gscData, setGscData] = useState<GscDataRow[] | null>(null);

  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState<boolean>(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  
  const [isTopicalAuthorityLoading, setIsTopicalAuthorityLoading] = useState<boolean>(false);
  const [topicalAuthorityError, setTopicalAuthorityError] = useState<string | null>(null);
  const [topicalAuthorityLoadingMessage, setTopicalAuthorityLoadingMessage] = useState<string>('');
  
  const [isContentStrategyLoading, setIsContentStrategyLoading] = useState<boolean>(false);
  const [contentStrategyError, setContentStrategyError] = useState<string | null>(null);
  const [contentStrategyLoadingMessage, setContentStrategyLoadingMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // --- PERSISTENCE EFFECTS ---

  useEffect(() => {
    try {
      const storedSite = window.localStorage.getItem('semantic-interlinker-site');
      const initialSite = storedSite ? JSON.parse(storedSite) : null;
      setSite(initialSite);

      if (initialSite) {
          const reportKey = `semantic-interlinker-report-${initialSite}`;
          const storedReportItem = window.localStorage.getItem(reportKey);
          const initialSavedReport = storedReportItem ? JSON.parse(storedReportItem) : null;
          if (initialSavedReport) {
            setSavedReport(initialSavedReport);
            setView('report');
          }
      }

      const savedSeozoomKey = window.localStorage.getItem(SEOZOOM_API_KEY_STORAGE_KEY) || '';
      setSeozoomApiKey(savedSeozoomKey);
      const savedSerpKey = window.localStorage.getItem(SERP_API_KEY_STORAGE_KEY) || '';
      setSerpApiKey(savedSerpKey);

    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
      setSite(null);
      setSavedReport(null);
      setSeozoomApiKey('');
      setSerpApiKey('');
    } finally {
        setIsLoadedFromStorage(true);
    }
  }, []);
  
  useEffect(() => {
    if (isLoadedFromStorage) {
      try {
        if (site) {
          window.localStorage.setItem('semantic-interlinker-site', JSON.stringify(site));
        } else {
          window.localStorage.removeItem('semantic-interlinker-site');
        }
      } catch (e) {
        console.error("Failed to persist site to localStorage:", e);
      }
    }
  }, [site, isLoadedFromStorage]);
  
  useEffect(() => {
    if (isLoadedFromStorage && site) {
      try {
        const key = `semantic-interlinker-report-${site}`;
        if (savedReport) {
          window.localStorage.setItem(key, JSON.stringify(savedReport));
        } else {
          window.localStorage.removeItem(key);
        }
      } catch (e) {
        console.error("Failed to persist report to localStorage:", e);
      }
    }
  }, [savedReport, site, isLoadedFromStorage]);

  useEffect(() => {
    if (isLoadedFromStorage) {
        try {
            window.localStorage.setItem(SEOZOOM_API_KEY_STORAGE_KEY, seozoomApiKey);
            window.localStorage.setItem(SERP_API_KEY_STORAGE_KEY, serpApiKey);
        } catch (e) {
            console.error("Failed to persist API keys to localStorage:", e);
        }
    }
  }, [seozoomApiKey, serpApiKey, isLoadedFromStorage]);
  
  const report = useMemo(() => savedReport?.report ?? null, [savedReport]);

  const sortedPageDiagnostics = useMemo(() => {
    if (!report?.page_diagnostics) return [];
    return [...report.page_diagnostics].sort((a, b) => b.internal_authority_score - a.internal_authority_score);
  }, [report?.page_diagnostics]);


  useEffect(() => {
    if (report && sortedPageDiagnostics.length > 0 && !selectedDeepAnalysisUrl) {
      setSelectedDeepAnalysisUrl(sortedPageDiagnostics[0].url);
    } else if (!report) {
      setSelectedDeepAnalysisUrl('');
    }
  }, [report, sortedPageDiagnostics, selectedDeepAnalysisUrl]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStartAnalysis = useCallback(async (payload: AnalysisPayload) => {
    setView('loading');
    setError(null);
    setDeepAnalysisReport(null);
    setDeepError(null);
    setSelectedDeepAnalysisUrl('');
    setSelectedSuggestions(new Set());
    setFilters({ minScore: 0, cluster: 'all', risk: 'all' });
    setGscData(payload.gscData);
    setLoadingMessage("Connessione al server per avviare l'analisi...");
    
    setSite(payload.siteUrl);
    setSavedReport(null);

    abortControllerRef.current = new AbortController();

    try {
        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            site_root: payload.siteUrl,
            gscData: payload.gscData,
            gscSiteUrl: payload.gscSiteUrl,
            ga4Data: payload.ga4Data,
            seozoomApiKey: seozoomApiKey,
            strategyOptions: payload.strategyOptions
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (!apiResponse.ok || !apiResponse.body) {
            let errorDetails = `Server responded with status ${apiResponse.status}.`;
            try {
                const errorData = await apiResponse.json();
                errorDetails = errorData.details || errorData.error || errorDetails;
            } catch (e) {
                errorDetails = await apiResponse.text();
            }
            throw new Error(errorDetails);
        }
        
        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'progress') {
                setLoadingMessage(event.message);
              } else if (event.type === 'done') {
                const newSavedReport: SavedReport = { report: event.payload, timestamp: Date.now() };
                setSavedReport(newSavedReport);
                setView('report');
              } else if (event.type === 'error') {
                throw new Error(event.details || event.error);
              }
            } catch (e) {
              console.error("Failed to parse stream chunk as JSON:", line, e);
            }
          }
        }

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Analysis request was aborted.');
            setError("L'analisi è stata annullata.");
        } else {
            setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        }
        setView('connect');
    } finally {
        abortControllerRef.current = null;
    }
  }, [seozoomApiKey]);

  const handleDeepAnalysis = useCallback(async (urlToAnalyze?: string) => {
    const finalUrl = urlToAnalyze || selectedDeepAnalysisUrl;
    if (!finalUrl || !report?.page_diagnostics) {
      setDeepError("Seleziona una pagina da analizzare.");
      return;
    }
    
    if (urlToAnalyze) {
        setSelectedDeepAnalysisUrl(urlToAnalyze);
    }

    setIsDeepLoading(true);
    setDeepAnalysisReport(null);
    setDeepError(null);

    const deepAnalysisSection = document.getElementById('deep-analysis-section');
    deepAnalysisSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const apiResponse = await fetch('/api/deep-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: finalUrl,
          pageDiagnostics: report.page_diagnostics,
          gscData: gscData
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
  
  const handleProgressCheck = useCallback(async () => {
    if (!savedReport) {
        setProgressError("Nessun report precedente trovato per il confronto.");
        return;
    }
    setIsProgressLoading(true);
    setProgressError(null);
    setProgressReport(null);

    try {
        const response = await fetch('/api/gsc/progress-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previousReport: savedReport.report })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
            throw new Error(errorData.details || `Server responded with status ${response.status}`);
        }

        const data: ProgressReport = await response.json();
        setProgressReport(data);
        setView('progress');
    } catch (err) {
        setProgressError(err instanceof Error ? err.message : "Si è verificato un errore durante l'analisi dei progressi.");
    } finally {
        setIsProgressLoading(false);
    }
  }, [savedReport]);

  const handleGenerateTopicalAuthority = useCallback(async (currentSerpApiKey: string) => {
    if (!report) return;

    setIsTopicalAuthorityLoading(true);
    setTopicalAuthorityError(null);
    setTopicalAuthorityLoadingMessage("Avvio dello stratega di Topical Authority...");
    
    if (currentSerpApiKey !== serpApiKey) {
        setSerpApiKey(currentSerpApiKey);
    }
    
    let analysisCompletedSuccessfully = false;

    try {
        const response = await fetch('/api/topical-authority', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_root: report.site,
                thematic_clusters: report.thematic_clusters,
                page_diagnostics: report.page_diagnostics,
                opportunity_hub_data: report.opportunity_hub || [],
                serpApiKey: currentSerpApiKey,
                seozoomApiKey: seozoomApiKey,
            })
        });

        if (!response.ok || !response.body) {
            const errorData = await response.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
            throw new Error(errorData.details || `Server responded with status ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'progress') {
                setTopicalAuthorityLoadingMessage(event.message);
              } else if (event.type === 'done') {
                analysisCompletedSuccessfully = true;
                const roadmap: TopicalAuthorityRoadmap = event.payload;
                setSavedReport(prev => {
                    if (!prev) return null;
                    const updatedReport: Report = { ...prev.report, topical_authority_roadmap: roadmap };
                    return { ...prev, report: updatedReport };
                });
              } else if (event.type === 'error') {
                throw new Error(event.details || event.error);
              }
            } catch (e) {
              console.error("Failed to parse topical authority stream chunk:", line, e);
            }
          }
        }

        if (!analysisCompletedSuccessfully) {
            throw new Error("La connessione con il server si è interrotta inaspettatamente. Il processo di analisi potrebbe aver superato i limiti di tempo o di memoria del server. Riprova o contatta il supporto se il problema persiste.");
        }

    } catch (err) {
      setTopicalAuthorityError(err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto durante la generazione della roadmap.');
    } finally {
      setIsTopicalAuthorityLoading(false);
    }
  }, [report, seozoomApiKey, serpApiKey]);

    const handleGenerateContentStrategy = useCallback(async () => {
        if (!report) return;

        setIsContentStrategyLoading(true);
        setContentStrategyError(null);
        setContentStrategyLoadingMessage("Avvio dell'analisi dei content gap...");

        try {
            const response = await fetch('/api/content-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    site_root: report.site,
                    thematic_clusters: report.thematic_clusters,
                    gscData: report.gscData,
                    ga4Data: report.ga4Data,
                    seozoomApiKey: seozoomApiKey,
                })
            });

            if (!response.ok || !response.body) {
                const errorData = await response.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
                throw new Error(errorData.details || `Server responded with status ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;
                try {
                const event = JSON.parse(line);
                if (event.type === 'progress') {
                    setContentStrategyLoadingMessage(event.message);
                } else if (event.type === 'done') {
                    const suggestions: ContentGapSuggestion[] = event.payload;
                    setSavedReport(prev => {
                        if (!prev) return null;
                        const updatedReport: Report = { ...prev.report, content_gap_suggestions: suggestions };
                        return { ...prev, report: updatedReport };
                    });
                } else if (event.type === 'error') {
                    throw new Error(event.details || event.error);
                }
                } catch (e) {
                console.error("Failed to parse content strategy stream chunk:", line, e);
                }
            }
            }
        } catch (err) {
        setContentStrategyError(err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto durante la generazione delle opportunità di contenuto.');
        } finally {
        setIsContentStrategyLoading(false);
        }
    }, [report, seozoomApiKey]);
  
  const handleNewAnalysis = () => {
    setSite(null);
    setSavedReport(null);
    setError(null);
    setDeepAnalysisReport(null);
    setView('connect');
  };

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

  if (!isLoadedFromStorage) {
    return (
       <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Inizializzazione client...</p>
          </div>
        </div>
    );
  }

  const renderContent = () => {
    switch (view) {
        case 'connect':
            return (
                <GscConnect 
                    onAnalysisStart={handleStartAnalysis}
                    savedReport={savedReport}
                    onProgressCheck={handleProgressCheck}
                    isProgressLoading={isProgressLoading}
                    progressError={progressError}
                    seozoomApiKey={seozoomApiKey}
                    onSeozoomApiKeyChange={setSeozoomApiKey}
                />
            );
        case 'loading':
            return (
                <div className="text-center py-16 flex flex-col items-center">
                    <LoadingSpinnerIcon className="w-16 h-16 text-blue-600 mb-4"/>
                    <h2 className="text-xl font-semibold mb-2">Analisi strategica in corso...</h2>
                    <p className="text-slate-500 max-w-md animate-fade-in-up" key={loadingMessage}>{loadingMessage}</p>
                </div>
            );
        case 'report':
            if (report) {
                return (
                    <ReportDisplay
                        report={report}
                        sortedPages={sortedPageDiagnostics}
                        savedReport={savedReport}
                        isProgressLoading={isProgressLoading}
                        onProgressCheck={handleProgressCheck}
                        onNewAnalysis={handleNewAnalysis}
                        onAnalyzeFromHub={(url) => handleDeepAnalysis(url)}
                        selectedSuggestions={selectedSuggestions}
                        onViewJson={handleViewJson}
                        onViewModification={handleViewModification}
                        onToggleSelection={handleToggleSelection}
                        selectedDeepAnalysisUrl={selectedDeepAnalysisUrl}
                        onSetSelectedDeepAnalysisUrl={setSelectedDeepAnalysisUrl}
                        onDeepAnalysis={() => handleDeepAnalysis()}
                        isDeepLoading={isDeepLoading}
                        deepError={deepError}
                        deepAnalysisReport={deepAnalysisReport}
                        filters={filters}
                        onFiltersChange={setFilters}
                        onGenerateTopicalAuthority={handleGenerateTopicalAuthority}
                        isTopicalAuthorityLoading={isTopicalAuthorityLoading}
                        topicalAuthorityError={topicalAuthorityError}
                        topicalAuthorityLoadingMessage={topicalAuthorityLoadingMessage}
                        initialSerpApiKey={serpApiKey}
                        onGenerateContentStrategy={handleGenerateContentStrategy}
                        isContentStrategyLoading={isContentStrategyLoading}
                        contentStrategyError={contentStrategyError}
                        contentStrategyLoadingMessage={contentStrategyLoadingMessage}
                    />
                );
            }
            // Fallback for error state or if report is null
            return (
                 <div className="text-center py-12 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-red-200">
                    <XCircleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Errore Imprevisto</h2>
                    <p className="text-slate-600 mb-4 whitespace-pre-wrap">{error || 'Impossibile visualizzare il report.'}</p>
                    <button onClick={handleNewAnalysis} className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors">
                        Inizia una Nuova Analisi
                    </button>
                </div>
            );
        case 'progress':
            if (progressReport) {
                return <ProgressDashboard report={progressReport} onBack={() => setView('report')} />;
            }
             // Fallback if progress report is missing
            setView('report'); 
            return null;
    }
  };


  return (
    <>
      {renderContent()}
      
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
    </>
  );
}