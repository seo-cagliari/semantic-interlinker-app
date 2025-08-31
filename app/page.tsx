'use client';

import React, { useState, useCallback } from 'react';
import { Suggestion, Report } from '../types';
import { SuggestionCard } from '../components/SuggestionCard';
import { JsonModal } from '../components/JsonModal';
import { ModificationModal } from '../components/ModificationModal';
import { BrainCircuitIcon, DocumentTextIcon, LinkIcon, LoadingSpinnerIcon, XCircleIcon } from '../components/Icons';

const App: React.FC = () => {
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for JSON data modal
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [selectedSuggestionJson, setSelectedSuggestionJson] = useState<string>('');
  
  // State for the new modification modal
  const [isModificationModalOpen, setIsModificationModalOpen] = useState<boolean>(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);

  // State for managing selected suggestions for user tracking
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleStartAnalysis = useCallback(async () => {
    if (!siteUrl || !/^(https?:\/\/)/.test(siteUrl)) {
        setError("Inserisci un URL valido (es. https://example.com)");
        return;
    }
    setIsLoading(true);
    setReport(null);
    setError(null);
    setSelectedSuggestions(new Set());

    try {
        const apiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site_root: siteUrl, scoreThreshold: 0.6 })
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
            throw new Error(errorData.details || `Server responded with status ${apiResponse.status}`);
        }
        
        const responseData: Report = await apiResponse.json();
        setReport(responseData);
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
        setIsLoading(false);
    }
  }, [siteUrl]);
  
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
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
            <div className="text-center py-16 max-w-2xl mx-auto">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Pronto a ottimizzare la struttura del tuo sito?</h2>
              <p className="text-slate-500 mb-6">Inserisci l'URL del tuo sito WordPress per avviare l'analisi semantica e trovare opportunità di link interni ad alto impatto.</p>
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
            </div>
          )}

          {isLoading && (
             <div className="text-center py-16 flex flex-col items-center">
                <LoadingSpinnerIcon className="w-16 h-16 text-blue-600 mb-4"/>
                <h2 className="text-xl font-semibold mb-2">Analisi di {siteUrl} in corso...</h2>
                <p className="text-slate-500">Scansione delle pagine, analisi semantica e identificazione delle opportunità.</p>
             </div>
          )}

          {report && (
            <>
              {renderSummary()}
              <div className="space-y-6">
                {report.suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.suggestion_id}
                    suggestion={suggestion}
                    isSelected={selectedSuggestions.has(suggestion.suggestion_id)}
                    onViewJson={handleViewJson}
                    onViewModification={handleViewModification}
                    onToggleSelection={handleToggleSelection}
                  />
                ))}
              </div>
            </>
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