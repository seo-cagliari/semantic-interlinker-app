
'use client';

// FORCE COMMIT: This comment is added to force the git system to recognize a change
// and push the entire clean project structure to GitHub, overwriting the old state.

import React, { useState, useCallback } from 'react';
import { Suggestion, Report } from '../types';
import { SuggestionCard } from '../components/SuggestionCard';
import { JsonModal } from '../components/JsonModal';
import { BrainCircuitIcon, DocumentTextIcon, LinkIcon, LoadingSpinnerIcon, DocumentDuplicateIcon, XCircleIcon } from '../components/Icons';

const App: React.FC = () => {
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSuggestionJson, setSelectedSuggestionJson] = useState<string>('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleStartAnalysis = useCallback(async () => {
    if (!siteUrl || !/^(https?:\/\/)/.test(siteUrl)) {
        setError("Please enter a valid URL (e.g., https://example.com)");
        return;
    }
    setIsLoading(true);
    setReport(null);
    setError(null);
    setSelectedSuggestions(new Set());

    try {
        // This is now a real API call to the Next.js endpoint
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
  
  const createDrafts = useCallback(async (suggestionsToDraft: Suggestion[]) => {
    if (suggestionsToDraft.length === 0) return;
    setIsDrafting(true);
    
    try {
        const apiResponse = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedSuggestions: suggestionsToDraft })
        });
        if (!apiResponse.ok) {
           const errorData = await apiResponse.json().catch(() => ({ details: 'Server returned a non-JSON error response.' }));
           throw new Error(errorData.details || `Failed to create drafts`);
        }
        
        const result = await apiResponse.json();
        console.log("Drafts creation successful:", result);
        
        // On success, remove the drafted suggestions from the selection
        setSelectedSuggestions(prev => {
            const newSet = new Set(prev);
            suggestionsToDraft.forEach(s => newSet.delete(s.suggestion_id));
            return newSet;
        });
        alert(`Successfully created ${suggestionsToDraft.length} draft(s) in WordPress.`);
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        alert(`Error creating drafts: ${message}`);
    } finally {
        setIsDrafting(false);
    }
  }, []);
  
  const handleCreateDraft = useCallback((suggestionId: string) => {
    const suggestion = report?.suggestions.find(s => s.suggestion_id === suggestionId);
    if (suggestion) {
        createDrafts([suggestion]);
    }
  }, [createDrafts, report]);
  
  const handleBulkCreateDraft = useCallback(() => {
    const suggestionsToDraft = report?.suggestions.filter(
        s => selectedSuggestions.has(s.suggestion_id)
    ) || [];
    createDrafts(suggestionsToDraft);
  }, [createDrafts, selectedSuggestions, report]);

  const handleViewJson = useCallback((suggestion: Suggestion) => {
    setSelectedSuggestionJson(JSON.stringify(suggestion, null, 2));
    setIsModalOpen(true);
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
          <p className="text-sm text-slate-500">Pages Scanned</p>
          <p className="text-2xl font-bold text-slate-800">{report.summary.pages_scanned}</p>
        </div>
        <div className="bg-slate-100 p-4 rounded-lg">
          <p className="text-sm text-slate-500">Indexable Pages</p>
          <p className="text-2xl font-bold text-slate-800">{report.summary.indexable_pages}</p>
        </div>
        <div className="bg-slate-100 p-4 rounded-lg">
          <p className="text-sm text-slate-500">Suggestions</p>
          <p className="text-2xl font-bold text-slate-800">{report.summary.suggestions_total}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-sm text-green-600">High Priority</p>
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
              <p className="text-slate-500 mt-1">AI-Powered Internal Linking Suggestions for WordPress</p>
            </div>
          </div>
        </header>

        <main className="pb-24">
          {!report && !isLoading && (
            <div className="text-center py-16 max-w-2xl mx-auto">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ready to optimize your site structure?</h2>
              <p className="text-slate-500 mb-6">Enter your WordPress site URL to start the semantic analysis and find high-impact internal linking opportunities.</p>
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
                      Scan Site
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
                <h2 className="text-xl font-semibold mb-2">Analyzing {siteUrl}...</h2>
                <p className="text-slate-500">Crawling pages, understanding semantics, and identifying opportunities.</p>
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
                    onCreateDraft={handleCreateDraft}
                    onToggleSelection={handleToggleSelection}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {report && selectedSuggestions.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 shadow-lg z-10 animate-fade-in-up">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <p className="font-semibold text-slate-700">{selectedSuggestions.size} suggestion(s) selected.</p>
                <button 
                    onClick={handleBulkCreateDraft}
                    disabled={isDrafting}
                    className="bg-slate-900 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
                >
                    {isDrafting ? <LoadingSpinnerIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
                    Create {selectedSuggestions.size} Drafts
                </button>
            </div>
        </div>
      )}

      <JsonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jsonString={selectedSuggestionJson}
      />
    </div>
  );
};

export default App;
