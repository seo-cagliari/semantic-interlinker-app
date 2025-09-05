import React, { useState, useEffect, useCallback } from 'react';
import { GscSite, GscDataRow, SavedReport } from '../types';
import { LoadingSpinnerIcon, GoogleGIcon, LinkIcon, XCircleIcon, ClockIcon } from './Icons';

type Strategy = 'global' | 'pillar' | 'money';
type StrategyOptions = { strategy: Strategy; targetUrls: string[] };

interface GscConnectProps {
  onAnalysisStart: (siteUrl: string, gscData: GscDataRow[], gscSiteUrl: string, seozoomApiKey?: string, strategyOptions?: StrategyOptions) => void;
  savedReport: SavedReport | null;
  onProgressCheck: () => void;
  isProgressLoading: boolean;
  progressError?: string | null;
}

const SEOZOOM_API_KEY_STORAGE_KEY = 'semantic-interlinker-seozoom-api-key';

export const GscConnect = (props: GscConnectProps) => {
  const { onAnalysisStart, savedReport, onProgressCheck, isProgressLoading, progressError } = props;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>('');
  const [seozoomApiKey, setSeozoomApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<Strategy>('global');
  const [strategyTargetUrl, setStrategyTargetUrl] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem(SEOZOOM_API_KEY_STORAGE_KEY) || '';
    setSeozoomApiKey(savedKey);
  }, []);
  
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
    if (strategy !== 'global' && !strategyTargetUrl) {
      setError("Per le strategie 'Pillar' o 'Money', è necessario fornire un URL target.");
      return;
    }
    setAnalysisLoading(true);
    setError(null);
    
    let finalSiteUrl = selectedGscSite;
    if (finalSiteUrl.startsWith('sc-domain:')) {
      finalSiteUrl = `https://${finalSiteUrl.substring(10)}`;
    }

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
      
      const strategyOptions: StrategyOptions = {
          strategy: strategy,
          targetUrls: strategy !== 'global' && strategyTargetUrl ? [strategyTargetUrl] : []
      };

      onAnalysisStart(finalSiteUrl, data, selectedGscSite, seozoomApiKey, strategyOptions);

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
            <div className="space-y-4 text-left">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-1">1. Seleziona il sito da analizzare</label>
                   <select
                    value={selectedGscSite}
                    onChange={(e) => setSelectedGscSite(e.target.value)}
                    disabled={sites.length === 0}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                  >
                    {sites.length > 0 ? (
                      sites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>)
                    ) : (
                      <option>Nessun sito trovato nel tuo account GSC.</option>
                    )}
                  </select>
                </div>
                
                <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-2">2. Scegli una strategia di analisi</label>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                            <input type="radio" id="global" name="strategy" value="global" checked={strategy === 'global'} onChange={() => setStrategy('global')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                            <label htmlFor="global" className="text-sm font-medium text-slate-700">Analisi Globale</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="radio" id="pillar" name="strategy" value="pillar" checked={strategy === 'pillar'} onChange={() => setStrategy('pillar')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                            <label htmlFor="pillar" className="text-sm font-medium text-slate-700">Strategia Pillar Page</label>
                        </div>
                         <div className="flex items-center gap-2">
                            <input type="radio" id="money" name="strategy" value="money" checked={strategy === 'money'} onChange={() => setStrategy('money')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                            <label htmlFor="money" className="text-sm font-medium text-slate-700">Strategia Money Page</label>
                        </div>
                    </div>
                </div>

                {strategy !== 'global' && (
                    <div className="animate-fade-in-up">
                        <label htmlFor="targetUrl" className="text-sm font-semibold text-slate-600 block mb-1">3. URL della Pagina Target</label>
                        <input
                            id="targetUrl"
                            type="url"
                            placeholder="https://esempio.com/pagina-pilastro/"
                            value={strategyTargetUrl}
                            onChange={(e) => setStrategyTargetUrl(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-sm"
                        />
                    </div>
                )}
               
               <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-1">3. Chiave API SEOZoom (Opzionale)</label>
                  <input
                    type="password"
                    placeholder="Inserisci la tua chiave API SEOZoom"
                    value={seozoomApiKey}
                    onChange={(e) => setSeozoomApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">Fornendo la chiave arricchirai le opportunità di contenuto con dati di mercato.</p>
               </div>
                <div className="text-center pt-2">
                   <button
                    onClick={handleStartAnalysis}
                    disabled={!selectedGscSite || isAnalysisLoading}
                    className="w-full sm:w-auto bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalysisLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    Analizza Sito
                  </button>
                </div>
            </div>
            <div className="mt-4 text-center">
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