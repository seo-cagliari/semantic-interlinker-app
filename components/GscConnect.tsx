import React, { useState, useEffect, useCallback } from 'react';
import { GscSite, GscDataRow, SavedReport } from '../types';
import { LoadingSpinnerIcon, GoogleGIcon, LinkIcon, XCircleIcon, ClockIcon } from './Icons';

interface GscConnectProps {
  onAnalysisStart: (siteUrl: string, gscData: GscDataRow[], gscSiteUrl: string, seozoomApiKey?: string) => void;
  savedReport: SavedReport | null;
  onProgressCheck: () => void;
  isProgressLoading: boolean;
  progressError?: string | null;
}

const SEOZOOM_API_KEY_STORAGE_KEY = 'semantic-interlinker-seozoom-api-key';

export const GscConnect: React.FC<GscConnectProps> = ({ onAnalysisStart, savedReport, onProgressCheck, isProgressLoading, progressError }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>('');
  const [seozoomApiKey, setSeozoomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SEOZOOM_API_KEY_STORAGE_KEY) || '';
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SEOZOOM_API_KEY_STORAGE_KEY, seozoomApiKey);
    }
  }, [seozoomApiKey]);

  const checkAuthStatus = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/gsc/sites');
      if (response.ok) {
        const siteData: GscSite[] = await response.json();
        setSites(siteData);
        if (siteData.length > 0) {
          // Try to pre-select based on saved report, otherwise default to first
          const defaultSite = savedReport?.report.gscSiteUrl || siteData[0].siteUrl;
          setSelectedGscSite(defaultSite);
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile verificare lo stato di autenticazione.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [savedReport]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);


  const handleStartAnalysis = async () => {
    if (!selectedGscSite) {
      setError("Seleziona una proprietà di GSC da analizzare.");
      return;
    }
    setAnalysisLoading(true);
    setError(null);
    
    // Normalize sc-domain URLs to valid HTTPS URLs for analysis
    let finalSiteUrl = selectedGscSite;
    if (finalSiteUrl.startsWith('sc-domain:')) {
      finalSiteUrl = `https://${finalSiteUrl.substring(10)}`;
    }

    // Save the site URL we are analyzing to localStorage to retrieve the report later
    localStorage.setItem('semantic-interlinker-site', finalSiteUrl);

    try {
      const response = await fetch('/api/gsc/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: selectedGscSite }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: 'Failed to retrieve GSC data.'}));
        throw new Error(errorData.details || errorData.error || 'Impossibile recuperare i dati da GSC.');
      }
      const data: GscDataRow[] = await response.json();
      onAnalysisStart(finalSiteUrl, data, selectedGscSite, seozoomApiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore imprevisto.');
      setAnalysisLoading(false);
    }
  };
  
  const handleLogout = async () => {
    setError(null);
    try {
      await fetch('/api/gsc/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setSites([]);
      setSelectedGscSite('');
    } catch (err) {
      setError('Disconnessione fallita. Riprova.');
    }
  };

  if (isLoading) {
      return (
        <div className="text-center py-12">
            <LoadingSpinnerIcon className="w-8 h-8 mx-auto text-slate-400" />
            <p className="mt-2 text-slate-500">Verifica autenticazione GSC...</p>
        </div>
      );
  }

  return (
    <div className="text-center py-12 max-w-3xl mx-auto">
       {savedReport && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in-up">
            <p className="text-sm text-slate-700">
                Trovato un report precedente per <strong>{savedReport.report.site}</strong> del {new Date(savedReport.timestamp).toLocaleDateString('it-IT')}.
                Puoi avviare una nuova analisi o controllare i progressi dall'ultima esecuzione.
            </p>
            <button
                onClick={onProgressCheck}
                disabled={isProgressLoading}
                className="mt-3 inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
                {isProgressLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                Controlla Progresso
            </button>
            {progressError && 
              <div className="mt-2 flex items-center justify-center gap-2 text-red-600">
                <XCircleIcon className="w-5 h-5 shrink-0" />
                <p className="text-sm">{progressError}</p>
              </div>
            }
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">Inizia connettendo Google Search Console</h2>
      <p className="text-slate-500 mb-6">Collega il tuo account per alimentare l'analisi con dati di ricerca reali e ottenere suggerimenti strategici.</p>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        {!isAuthenticated ? (
          <div>
            <p className="text-slate-600 mb-4">È richiesto l'accesso per leggere i dati del tuo sito da Google Search Console.</p>
            <a 
              href="/api/gsc/auth"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors border border-blue-700"
            >
              <GoogleGIcon className="w-5 h-5" />
              Collega Google Search Console
            </a>
          </div>
        ) : (
          <div>
            <div className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <select
                    value={selectedGscSite}
                    onChange={(e) => setSelectedGscSite(e.target.value)}
                    disabled={sites.length === 0}
                    className="w-full sm:col-span-2 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  >
                    {sites.length > 0 ? (
                      sites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>)
                    ) : (
                      <option>Nessun sito trovato nel tuo account GSC.</option>
                    )}
                  </select>
                   <button
                    onClick={handleStartAnalysis}
                    disabled={!selectedGscSite || isAnalysisLoading}
                    className="bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalysisLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    Analizza Sito
                  </button>
               </div>
               <div>
                  <input
                    type="password"
                    placeholder="Chiave API SEOZoom (Opzionale)"
                    value={seozoomApiKey}
                    onChange={(e) => setSeozoomApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-left">Fornendo la chiave arricchirai le opportunità di contenuto con dati di mercato.</p>
               </div>
            </div>
            <div className="mt-4">
              <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
                Disconnetti Account Google
              </button>
            </div>
          </div>
        )}
        {error && 
          <div className="mt-4 flex items-center justify-center gap-2 text-red-600 text-left">
            <XCircleIcon className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        }
      </div>
    </div>
  );
};