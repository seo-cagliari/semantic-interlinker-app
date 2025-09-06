
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Suggestion, Report, GscDataRow, SavedReport, ProgressReport, DeepAnalysisReport, Ga4DataRow } from '../types';
import { JsonModal } from './JsonModal';
import { ModificationModal } from './ModificationModal';
import { LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { ProgressReportModal } from './ProgressReportModal';
import { ReportDisplay } from './ReportDisplay';
import { GscConnect } from './GscConnect';

const loadingMessages = [
  "Avvio dell'analisi strategica...",
  "Sto interrogando i dati di Google Search Console (ultimi 90 giorni)...",
  "Sto recuperando i dati comportamentali da Google Analytics 4...",
  "Calcolo dell'autorità interna e del potenziale di crescita per ogni pagina...",
  "Orchestrazione dell'agente AI 'Information Architect'...",
  "Raggruppamento delle pagine in cluster tematici per l'analisi...",
  "Deploy dell'agente AI 'Semantic Linking Strategist'...",
  "Identificazione delle opportunità di linking e diagnosi dei rischi (es. cannibalizzazione)...",
  "Attivazione dell'agente AI 'Content Strategist'...",
  "Ricerca di 'content gap' e nuove opportunità editoriali...",
  "Quasi finito, sto compilando il report finale e il cruscotto strategico...",
];

const SEOZOOM_API_KEY_STORAGE_KEY = 'semantic-interlinker-seozoom-api-key';

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
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [selectedSuggestionJson, setSelectedSuggestionJson] = useState<string>('');
  const [isModificationModalOpen, setIsModificationModalOpen] = useState<boolean>(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  const [selectedDeepAnalysisUrl, setSelectedDeepAnalysisUrl] = useState<string>('');
  const [deepAnalysisReport, setDeepAnalysisReport] = useState<DeepAnalysisReport | null>(null);
  const [isDeepLoading, setIsDeepLoading] = useState<boolean>(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  
  const [gscData, setGscData] = useState<GscDataRow[] | null>(null);

  const [progressReport, setProgressReport] = useState<ProgressReport | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState<boolean>(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // --- PERSISTENCE EFFECTS ---

  useEffect(() => {
    // This component is wrapped in <ClientOnly>, so this effect runs once on client mount.
    try {
      const storedSite = window.localStorage.getItem('semantic-interlinker-site');
      const initialSite = storedSite ? JSON.parse(storedSite) : null;
      setSite(initialSite);

      if (initialSite) {
          const reportKey = `semantic-interlinker-report-${initialSite}`;
          const storedReportItem = window.localStorage.getItem(reportKey);
          const initialSavedReport = storedReportItem ? JSON.parse(storedReportItem) : null;
          setSavedReport(initialSavedReport);
      }

      const savedKey = window.localStorage.getItem(SEOZOOM_API_KEY_STORAGE_KEY) || '';
      setSeozoomApiKey(savedKey);

    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
      setSite(null);
      setSavedReport(null);
      setSeozoomApiKey('');
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
        } catch (e) {
            console.error("Failed to persist SEOZoom API key to localStorage:", e);
        }
    }
  }, [seozoomApiKey, isLoadedFromStorage]);
  
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
    const cleanup = () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    };

    if (isLoading) {
      let messageIndex = 0;
      setLoadingMessage(loadingMessages[0]);
      
      loadingIntervalRef.current = setInterval(() => {
        messageIndex++;
        if (messageIndex < loadingMessages.length) {
          setLoadingMessage(loadingMessages[messageIndex]);
        } else {
          cleanup();
        }
      }, 3000);
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleStartAnalysis = useCallback(async (payload: AnalysisPayload) => {
    setIsLoading(true);
    setError(null);
    setDeepAnalysisReport(null);
    setDeepError(null);
    setSelectedDeepAnalysisUrl('');
    setSelectedSuggestions(new Set());
    setGscData(payload.gscData);
    
    setSite(payload.siteUrl);
    setSavedReport(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          signal: controller.signal
        });
        
        if (!apiResponse.ok) {
            let errorDetails = `Server responded with status ${apiResponse.status}.`;
            try {
                const errorData = await apiResponse.json();
                errorDetails = errorData.details || errorData.error || errorDetails;
            } catch (e) {
                errorDetails = await apiResponse.text();
            }
            throw new Error(errorDetails);
        }
        
        const responseData: Report = await apiResponse.json();
        const newSavedReport: SavedReport = { report: responseData, timestamp: Date.now() };
        
        setSavedReport(newSavedReport);

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Analysis request was aborted.');
            setError("L'analisi è stata annullata.");
        } else {
            setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
        }
    } finally {
        setIsLoading(false);
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
        setIsProgressModalOpen(true);
    } catch (err) {
        setProgressError(err instanceof Error ? err.message : "Si è verificato un errore durante l'analisi dei progressi.");
    } finally {
        setIsProgressLoading(false);
    }
  }, [savedReport]);
  
  const handleNewAnalysis = () => {
    setSite(null);
    setSavedReport(null);
    setError(null);
    setDeepAnalysisReport(null);
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
    // This loader is shown while reading from localStorage, it's client-side only.
    return (
       <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Inizializzazione client...</p>
          </div>
        </div>
    );
  }

  return (
    <>
      {!report && !isLoading && !error && (
        <GscConnect 
          onAnalysisStart={handleStartAnalysis}
          savedReport={savedReport}
          onProgressCheck={handleProgressCheck}
          isProgressLoading={isProgressLoading}
          progressError={progressError}
          seozoomApiKey={seozoomApiKey}
          onSeozoomApiKeyChange={setSeozoomApiKey}
        />
      )}

      {isLoading && (
          <div className="text-center py-16 flex flex-col items-center">
            <LoadingSpinnerIcon className="w-16 h-16 text-blue-600 mb-4"/>
            <h2 className="text-xl font-semibold mb-2">Analisi strategica in corso...</h2>
            <p className="text-slate-500 max-w-md animate-fade-in-up" key={loadingMessage}>{loadingMessage}</p>
          </div>
      )}

      {error && (
        <div className="text-center py-12 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md border border-red-200">
          <XCircleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Si è verificato un errore</h2>
          <p className="text-slate-600 mb-4 whitespace-pre-wrap">{error}</p>
          <button onClick={handleNewAnalysis} className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors">
              Riprova
          </button>
        </div>
      )}

      {report && (
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
        />
      )}
      
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
      <ProgressReportModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        report={progressReport}
      />
    </>
  );
}
