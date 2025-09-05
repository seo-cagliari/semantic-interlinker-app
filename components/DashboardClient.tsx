'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Suggestion, Report, GscDataRow, SavedReport, ProgressReport, DeepAnalysisReport } from '../types';
import { JsonModal } from './JsonModal';
import { ModificationModal } from './ModificationModal';
import { GscConnect } from './GscConnect';
import { BrainCircuitIcon, LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { ProgressReportModal } from './ProgressReportModal';
import useLocalStorage from '../hooks/useLocalStorage';
import ReportDisplay from './ReportDisplay'; // Import the new component

const loadingMessages = [
  "Avvio dell'analisi strategica...",
  "Sto interrogando i dati di Google Search Console (ultimi 90 giorni)...",
  "Calcolo dell'autorità interna e del potenziale di crescita per ogni pagina...",
  "Orchestrazione dell'agente AI 'Information Architect'...",
  "Raggruppamento delle pagine in cluster tematici per l'analisi...",
  "Deploy dell'agente AI 'Semantic Linking Strategist'...",
  "Identificazione delle opportunità di linking e diagnosi dei rischi (es. cannibalizzazione)...",
  "Attivazione dell'agente AI 'Content Strategist'...",
  "Ricerca di 'content gap' e nuove opportunità editoriali...",
  "Quasi finito, sto compilando il report finale e il cruscotto strategico...",
];

const DashboardClient: React.FC = () => {
  const [site, setSite] = useLocalStorage<string | null>('semantic-interlinker-site', null);
  const [savedReport, setSavedReport] = useLocalStorage<SavedReport | null>(site ? `semantic-interlinker-report-${site}` : null, null);

  const [report, setReport] = useState<Report | null>(savedReport?.report || null);
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

  useEffect(() => {
     if (savedReport) {
        setReport(savedReport.report);
         if (savedReport.report.page_diagnostics && savedReport.report.page_diagnostics.length > 0) {
            const sortedPages = [...savedReport.report.page_diagnostics].sort((a, b) => b.internal_authority_score - a.internal_authority_score);
            setSelectedDeepAnalysisUrl(sortedPages[0].url);
          }
     }
  }, [savedReport]);
  
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

  const handleStartAnalysis = useCallback(async (siteUrl: string, gscDataPayload: GscDataRow[], gscSiteUrl: string, seozoomApiKey?: string, strategyOptions?: { strategy: 'global' | 'pillar' | 'money'; targetUrls: string[] }) => {
    setIsLoading(true);
    setReport(null);
    setError(null);
    setDeepAnalysisReport(null);
    setDeepError(null);
    setSelectedDeepAnalysisUrl('');
    setSelectedSuggestions(new Set());
    setGscData(gscDataPayload);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            site_root: siteUrl,
            gscData: gscDataPayload,
            gscSiteUrl: gscSiteUrl,
            seozoomApiKey: seozoomApiKey,
            strategyOptions: strategyOptions
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
        const reportToSave: SavedReport = { report: responseData, timestamp: Date.now() };
        
        setSite(siteUrl);
        setSavedReport(reportToSave);
        setReport(responseData);

        if (responseData.page_diagnostics && responseData.page_diagnostics.length > 0) {
            const sortedPages = [...responseData.page_diagnostics].sort((a, b) => b.internal_authority_score - a.internal_authority_score);
            setSelectedDeepAnalysisUrl(sortedPages[0].url);
        }
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
  }, [setSite, setSavedReport]);

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
    setReport(null);
    setError(null);
    setDeepAnalysisReport(null);
    setSavedReport(null);
    setSite(null);
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
            <GscConnect 
              onAnalysisStart={handleStartAnalysis}
              savedReport={savedReport}
              onProgressCheck={handleProgressCheck}
              isProgressLoading={isProgressLoading}
              progressError={progressError}
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
              <button onClick={() => { setError(null); setIsLoading(false); handleNewAnalysis(); }} className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors">
                  Riprova
              </button>
            </div>
          )}

          {report && (
            <ReportDisplay
              report={report}
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
              onDeepAnalysis={handleDeepAnalysis}
              isDeepLoading={isDeepLoading}
              deepError={deepError}
              deepAnalysisReport={deepAnalysisReport}
            />
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
      <ProgressReportModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        report={progressReport}
      />
    </div>
  );
};

export default DashboardClient;
