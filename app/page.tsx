'use client';

import React, { useState, useCallback } from 'react';
import { Suggestion, Report, ThematicCluster, DeepAnalysisReport } from '../types';
import { SuggestionCard } from '../components/SuggestionCard';
import { JsonModal } from '../components/JsonModal';
import { ModificationModal } from '../components/ModificationModal';
import { ContentGapAnalysis } from '../components/ContentGapAnalysis';
import { DeepAnalysisReportDisplay } from '../components/DeepAnalysisReportDisplay';
import { BrainCircuitIcon, DocumentTextIcon, LinkIcon, LoadingSpinnerIcon, XCircleIcon, FolderIcon } from '../components/Icons';

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

const App: React.FC = () => {
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [maxSuggestions, setMaxSuggestions] = useState<number>(7);
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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


  const handleStartAnalysis = useCallback(async () => {
    if (!siteUrl || !/^(https?:\/\/)/.test(siteUrl)) {
        setError("Inserisci un URL valido (es. https://example.com)");
        return;
    }
    setIsLoading(true);
    setReport(null);
    setError(null);
    setDeepAnalysisReport(null);
    setDeepError(null);
    setSelectedDeepAnalysisUrl('');
    setSelectedSuggestions(new Set());

    try {
        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            site_root: siteUrl, 
            scoreThreshold: 0.6,
            maxSuggestions: maxSuggestions 
          })
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
            throw new Error(errorData.details || `Server responded with status ${apiResponse.status}`);
        }
        
        const responseData: Report = await apiResponse.json();
        setReport(responseData);
        if (responseData.allSiteUrls && responseData.allSiteUrls.length > 0) {
            setSelectedDeepAnalysisUrl(responseData.allSiteUrls[0]);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
        setIsLoading(false);
    }
  }, [siteUrl, maxSuggestions]);

  const handleDeepAnalysis = useCallback(async () => {
    if (!selectedDeepAnalysisUrl || !report?.allSiteUrls) {
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
          allSiteUrls: report.allSiteUrls
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
  }, [selectedDeepAnalysisUrl, report?.allSiteUrls]);
  
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

  const renderSummary = () => {
    if (!report) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-center">
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
    );
  };
  
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
          {!report && !isLoading && (
            <div className="text-center py-12 max-w-3xl mx-auto">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Pronto a ottimizzare la struttura del tuo sito?</h2>
              <p className="text-slate-500 mb-6">Inserisci l'URL del tuo sito WordPress per avviare l'analisi semantica e trovare opportunità di link interni ad alto impatto.</p>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <input 
                        type="url"
                        value={siteUrl}
                        onChange={(e) => {
                            setSiteUrl(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="https://your-wordpress-site.com"
                        className="w-full max-w-md px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <button
                        onClick={handleStartAnalysis}
                        disabled={!siteUrl}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <LinkIcon className="w-5 h-5" />
                        Analizza Sito
                    </button>
                </div>
                 {error && 
                  <div className="mt-4 flex items-center justify-center gap-2 text-red-600">
                    <XCircleIcon className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                }
                <div className="mt-6">
                  <label htmlFor="maxSuggestions" className="block text-sm font-medium text-slate-600 mb-2">
                    Numero massimo di suggerimenti: <span className="font-bold text-blue-600">{maxSuggestions}</span>
                  </label>
                  <input
                    id="maxSuggestions"
                    type="range"
                    min="5"
                    max="20"
                    value={maxSuggestions}
                    onChange={(e) => setMaxSuggestions(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {isLoading && (
             <div className="text-center py-16 flex flex-col items-center">
                <LoadingSpinnerIcon className="w-16 h-16 text-blue-600 mb-4"/>
                <h2 className="text-xl font-semibold mb-2">Analisi di {siteUrl} in corso...</h2>
                <p className="text-slate-500">Scansione delle pagine, creazione mappa tematica e generazione suggerimenti.</p>
             </div>
          )}

          {report && (
            <div className="animate-fade-in-up">
              {renderSummary()}
              {report.thematic_clusters && <ThematicClusters clusters={report.thematic_clusters} />}
              
              <div className="mt-16 bg-slate-100 p-6 rounded-2xl border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisi Approfondita di Pagina</h2>
                <p className="text-slate-600 mb-4">Seleziona una pagina per analizzarne il contenuto e ricevere suggerimenti specifici su link interni e miglioramenti.</p>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                   <select
                     value={selectedDeepAnalysisUrl}
                     onChange={(e) => setSelectedDeepAnalysisUrl(e.target.value)}
                     className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                   >
                     {report.allSiteUrls.map(url => <option key={url} value={url}>{url}</option>)}
                   </select>
                   <button
                     onClick={handleDeepAnalysis}
                     disabled={isDeepLoading}
                     className="w-full sm:w-auto bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2"
                   >
                     {isDeepLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <BrainCircuitIcon className="w-5 h-5" />}
                     Analisi Dettagliata
                   </button>
                </div>
                {deepError && 
                  <div className="mt-4 flex items-center gap-2 text-red-600">
                    <XCircleIcon className="w-5 h-5" />
                    <p className="text-sm">{deepError}</p>
                  </div>
                }
              </div>

              {isDeepLoading && (
                <div className="text-center py-12 flex flex-col items-center">
                  <LoadingSpinnerIcon className="w-12 h-12 text-slate-600 mb-4"/>
                  <h3 className="text-lg font-semibold mb-2">Analisi approfondita in corso...</h3>
                  <p className="text-slate-500 max-w-md">Sto leggendo il contenuto della pagina e generando suggerimenti per link inbound, outbound e miglioramenti testuali.</p>
                </div>
              )}

              {deepAnalysisReport && <DeepAnalysisReportDisplay report={deepAnalysisReport} />}
              
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
               {report.content_gap_suggestions && report.content_gap_suggestions.length > 0 && (
                <ContentGapAnalysis suggestions={report.content_gap_suggestions} />
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

export default App;