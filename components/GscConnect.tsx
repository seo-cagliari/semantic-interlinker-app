
import React, { useState, useEffect, useCallback } from 'react';
import { GscSite, GscDataRow, SavedReport, Ga4Property, Ga4DataRow } from '../types';
import { LoadingSpinnerIcon, GoogleGIcon, LinkIcon, XCircleIcon, ClockIcon, CheckCircleIcon } from './Icons';

type Strategy = 'global' | 'pillar' | 'money';
type StrategyOptions = { strategy: Strategy; targetUrls: string[] };

interface AnalysisPayload {
    siteUrl: string;
    gscData: GscDataRow[];
    gscSiteUrl: string;
    ga4Data?: Ga4DataRow[];
    strategyOptions?: StrategyOptions;
}

interface GscConnectProps {
  onAnalysisStart: (payload: AnalysisPayload) => void;
  savedReport: SavedReport | null;
  onProgressCheck: () => void;
  isProgressLoading: boolean;
  progressError?: string | null;
  seozoomApiKey: string;
  onSeozoomApiKeyChange: (key: string) => void;
}

export const GscConnect = (props: GscConnectProps) => {
  const { onAnalysisStart, savedReport, onProgressCheck, isProgressLoading, progressError, seozoomApiKey, onSeozoomApiKeyChange } = props;
  
  // GSC State
  const [isGscAuthenticated, setIsGscAuthenticated] = useState<boolean | null>(null);
  const [gscSites, setGscSites] = useState<GscSite[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>('');
  const [isGscLoading, setIsGscLoading] = useState<boolean>(true);
  
  // GA4 State
  const [isGa4Authenticated, setIsGa4Authenticated] = useState<boolean | null>(null);
  const [ga4Properties, setGa4Properties] = useState<Ga4Property[]>([]);
  const [selectedGa4Property, setSelectedGa4Property] = useState<string>('');
  const [isGa4Loading, setIsGa4Loading] = useState<boolean>(true);

  // General State
  const [isAnalysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy>('global');
  const [strategyTargetUrl, setStrategyTargetUrl] = useState('');

  const checkGscAuth = useCallback(async () => {
    setIsGscLoading(true);
    try {
      const response = await fetch('/api/gsc/sites');
      if (response.ok) {
        const siteData: GscSite[] = await response.json();
        setGscSites(siteData);
        if (siteData.length > 0) {
          const defaultSite = savedReport?.report.gscSiteUrl || siteData[0].siteUrl;
          setSelectedGscSite(defaultSite);
        }
        setIsGscAuthenticated(true);
      } else {
        setIsGscAuthenticated(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile verificare lo stato di autenticazione GSC.');
      setIsGscAuthenticated(false);
    } finally {
      setIsGscLoading(false);
    }
  }, [savedReport]);

  const checkGa4Auth = useCallback(async () => {
    setIsGa4Loading(true);
    try {
      const response = await fetch('/api/ga4/properties');
      if (response.ok) {
        const propData: Ga4Property[] = await response.json();
        setGa4Properties(propData);
        if (propData.length > 0) {
          setSelectedGa4Property(propData[0].name);
        }
        setIsGa4Authenticated(true);
      } else {
        setIsGa4Authenticated(false);
      }
    } catch (err) {
      console.error("GA4 auth check failed:", err);
      setIsGa4Authenticated(false);
    } finally {
      setIsGa4Loading(false);
    }
  }, []);

  useEffect(() => {
    checkGscAuth();
    checkGa4Auth();
  }, [checkGscAuth, checkGa4Auth]);

  const handleStartAnalysis = async () => {
    setError(null);
    if (!selectedGscSite) {
      setError("Seleziona una proprietà di GSC da analizzare."); return;
    }
    if (strategy !== 'global' && !strategyTargetUrl) {
      setError("Per le strategie 'Pillar' o 'Money', è necessario fornire un URL target."); return;
    }
    
    setAnalysisLoading(true);
    
    let finalSiteUrl = selectedGscSite;
    if (finalSiteUrl.startsWith('sc-domain:')) {
      finalSiteUrl = `https://${finalSiteUrl.substring(10)}`;
    }

    try {
      // Fetch GSC Data (required)
      const gscResponse = await fetch('/api/gsc/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: selectedGscSite }),
      });
      if (!gscResponse.ok) throw new Error('Impossibile recuperare i dati da GSC.');
      const gscData: GscDataRow[] = await gscResponse.json();
      
      // Fetch GA4 Data (optional)
      let ga4Data: Ga4DataRow[] | undefined = undefined;
      if (isGa4Authenticated && selectedGa4Property) {
        try {
            const ga4Response = await fetch('/api/ga4/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId: selectedGa4Property }),
            });
            if (ga4Response.ok) {
                ga4Data = await ga4Response.json();
            } else {
                console.warn("Failed to fetch GA4 data, proceeding without it.");
            }
        } catch (ga4Err) {
            console.warn("Error fetching GA4 data:", ga4Err);
        }
      }
      
      const strategyOptions: StrategyOptions = {
          strategy: strategy,
          targetUrls: strategy !== 'global' && strategyTargetUrl ? [strategyTargetUrl] : []
      };

      onAnalysisStart({ siteUrl: finalSiteUrl, gscData, gscSiteUrl: selectedGscSite, ga4Data, strategyOptions });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore imprevisto.');
      setAnalysisLoading(false);
    }
  };
  
  const handleGscLogout = async () => {
    await fetch('/api/gsc/logout', { method: 'POST' });
    setIsGscAuthenticated(false);
    setGscSites([]);
  };

  const handleGa4Logout = async () => {
    await fetch('/api/ga4/logout', { method: 'POST' });
    setIsGa4Authenticated(false);
    setGa4Properties([]);
  };

  if (isGscLoading || isGa4Loading) {
      return (
        <div className="text-center py-12">
            <LoadingSpinnerIcon className="w-8 h-8 mx-auto text-slate-400" />
            <p className="mt-2 text-slate-500">Verifica autenticazioni...</p>
        </div>
      );
  }

  return (
    <div className="text-center py-12 max-w-4xl mx-auto">
       {savedReport && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in-up">
            <p className="text-sm text-slate-700">Trovato un report precedente per <strong>{savedReport.report.site}</strong> del {new Date(savedReport.timestamp).toLocaleDateString('it-IT')}.</p>
            <button onClick={onProgressCheck} disabled={isProgressLoading} className="mt-3 inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                {isProgressLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                Controlla Progresso
            </button>
            {progressError && <div className="mt-2 flex items-center justify-center gap-2 text-red-600"><XCircleIcon className="w-5 h-5 shrink-0" /><p className="text-sm">{progressError}</p></div>}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">Inizia connettendo le tue fonti dati</h2>
      <p className="text-slate-500 mb-6">Collega Google Search Console (obbligatorio) e Google Analytics 4 (consigliato) per un'analisi completa.</p>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
        {/* GSC Section */}
        <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-left">1. Google Search Console (Obbligatorio)</h3>
            {!isGscAuthenticated ? (
                <a href="/api/gsc/auth" className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"><GoogleGIcon className="w-5 h-5" />Connetti Google Search Console</a>
            ) : (
                <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-700 font-medium flex items-center gap-2"><CheckCircleIcon className="w-5 h-5"/>Connesso a GSC</p>
                      <button onClick={handleGscLogout} className="text-xs text-slate-500 hover:underline">Disconnetti</button>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-600 block mb-1">Seleziona il sito da analizzare</label>
                      <select value={selectedGscSite} onChange={(e) => setSelectedGscSite(e.target.value)} disabled={gscSites.length === 0} className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white">
                        {gscSites.length > 0 ? gscSites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>) : <option>Nessun sito trovato.</option>}
                      </select>
                    </div>
                </div>
            )}
        </div>
        
        {/* GA4 Section */}
        <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-left">2. Google Analytics 4 (Consigliato)</h3>
            {!isGa4Authenticated ? (
                <a href="/api/ga4/auth" className="w-full inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 font-bold py-3 px-4 rounded-lg hover:bg-slate-100 transition-colors"><GoogleGIcon className="w-5 h-5" />Connetti Google Analytics 4</a>
            ) : (
                <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-700 font-medium flex items-center gap-2"><CheckCircleIcon className="w-5 h-5"/>Connesso a GA4</p>
                      <button onClick={handleGa4Logout} className="text-xs text-slate-500 hover:underline">Disconnetti</button>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-600 block mb-1">Seleziona la proprietà GA4</label>
                      <select value={selectedGa4Property} onChange={(e) => setSelectedGa4Property(e.target.value)} disabled={ga4Properties.length === 0} className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white">
                        {ga4Properties.length > 0 ? ga4Properties.map(prop => <option key={prop.name} value={prop.name}>{prop.displayName}</option>) : <option>Nessuna proprietà trovata.</option>}
                      </select>
                    </div>
                </div>
            )}
        </div>
        
        {/* Strategy & API Key Section */}
        <div className="p-4 border border-slate-200 rounded-lg text-left space-y-4">
            <h3 className="font-semibold text-lg">3. Configurazione Analisi</h3>
            <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">Scegli una strategia di analisi</label>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2"><input type="radio" id="global" name="strategy" value="global" checked={strategy === 'global'} onChange={() => setStrategy('global')} className="h-4 w-4 text-blue-600" /><label htmlFor="global" className="text-sm font-medium">Analisi Globale</label></div>
                    <div className="flex items-center gap-2"><input type="radio" id="pillar" name="strategy" value="pillar" checked={strategy === 'pillar'} onChange={() => setStrategy('pillar')} className="h-4 w-4 text-blue-600" /><label htmlFor="pillar" className="text-sm font-medium">Pillar Page</label></div>
                    <div className="flex items-center gap-2"><input type="radio" id="money" name="strategy" value="money" checked={strategy === 'money'} onChange={() => setStrategy('money')} className="h-4 w-4 text-blue-600" /><label htmlFor="money" className="text-sm font-medium">Money Page</label></div>
                </div>
            </div>
             {strategy !== 'global' && (
                <div className="animate-fade-in-up">
                    <label htmlFor="targetUrl" className="text-sm font-semibold text-slate-600 block mb-1">URL Pagina Target</label>
                    <input id="targetUrl" type="url" placeholder="https://esempio.com/pagina-target" value={strategyTargetUrl} onChange={(e) => setStrategyTargetUrl(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm" />
                </div>
             )}
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-1">Chiave API SEOZoom (Opzionale)</label>
              <input type="password" placeholder="Inserisci la tua chiave API SEOZoom" value={seozoomApiKey} onChange={(e) => onSeozoomApiKeyChange(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm" />
              <p className="text-xs text-slate-400 mt-1">Arricchisce le opportunità di contenuto con dati di mercato.</p>
           </div>
        </div>

        {/* Action Button */}
        <div className="text-center pt-2">
           <button onClick={handleStartAnalysis} disabled={!isGscAuthenticated || !selectedGscSite || isAnalysisLoading} className="w-full sm:w-auto bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2">
            {isAnalysisLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            Analizza Sito
          </button>
        </div>
        {error && <div className="mt-4 flex items-center justify-center gap-2 text-red-600"><XCircleIcon className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p></div>}
      </div>
    </div>
  );
};
