import React, { useState, useEffect, useCallback } from 'react';
import { GscSite, Report, GscDataRow } from '../types';
import { BrainCircuitIcon, LoadingSpinnerIcon, XCircleIcon, GoogleGIcon, ChartBarIcon } from './Icons';

interface GscConnectProps {
  report: Report;
  selectedDeepAnalysisUrl: string;
  setSelectedDeepAnalysisUrl: (url: string) => void;
  onAnalyze: (gscData?: GscDataRow[]) => void;
  isDeepLoading: boolean;
  deepError: string | null;
}

export const GscConnect: React.FC<GscConnectProps> = ({
  report,
  selectedDeepAnalysisUrl,
  setSelectedDeepAnalysisUrl,
  onAnalyze,
  isDeepLoading,
  deepError,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [gscData, setGscData] = useState<GscDataRow[] | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gsc/sites');
      if (response.ok) {
        const siteData: GscSite[] = await response.json();
        setSites(siteData);
        // Try to pre-select a matching site
        const matchingSite = siteData.find(s => s.siteUrl === report.site || s.siteUrl.includes(new URL(report.site).hostname));
        if (matchingSite) {
          setSelectedGscSite(matchingSite.siteUrl);
        } else if (siteData.length > 0) {
            setSelectedGscSite(siteData[0].siteUrl)
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsAuthLoading(false);
    }
  }, [report.site]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleConnect = () => {
    const authWindow = window.open('/api/gsc/auth', '_blank', 'width=500,height=600');
    const timer = setInterval(() => {
        if (authWindow?.closed) {
            clearInterval(timer);
            setIsAuthLoading(true);
            checkAuthStatus(); // Re-check auth status after window is closed
        }
    }, 1000);
  };

  const handleFetchDataAndAnalyze = async () => {
    if (!selectedGscSite) {
      // Analyze without GSC data if none is selected
      onAnalyze();
      return;
    }
    
    try {
        const response = await fetch('/api/gsc/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: selectedGscSite }),
        });
        if (!response.ok) {
            throw new Error('Failed to fetch GSC data.');
        }
        const data: GscDataRow[] = await response.json();
        setGscData(data);
        onAnalyze(data);
    } catch (error) {
        console.error(error);
        onAnalyze(); // Proceed with analysis even if GSC data fails
    }
  }

  return (
    <div className="mt-16 bg-slate-100 p-6 rounded-2xl border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Analisi Approfondita di Pagina</h2>
      <p className="text-slate-600 mb-4">Seleziona una pagina e collega Google Search Console per arricchire l'analisi con dati di ricerca reali.</p>
      
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
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
                <label className="text-sm font-semibold text-slate-600 block mb-1">Dati da Google Search Console</label>
                {isAuthLoading ? (
                    <div className="h-12 flex items-center justify-center bg-slate-100 rounded-lg"><LoadingSpinnerIcon className="w-5 h-5" /></div>
                ) : isAuthenticated && sites.length > 0 ? (
                    <select
                        value={selectedGscSite}
                        onChange={(e) => setSelectedGscSite(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                    >
                        <option value="">Non usare dati GSC</option>
                        {sites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>)}
                    </select>
                ) : (
                    <button onClick={handleConnect} className="w-full bg-white text-slate-700 font-bold py-3 px-4 rounded-lg hover:bg-slate-100 transition-colors border border-slate-300 flex items-center justify-center gap-2">
                        <GoogleGIcon className="w-5 h-5" />
                        Collega Google Search Console
                    </button>
                )}
            </div>
        </div>
        <div className="mt-4">
             <button
                onClick={handleFetchDataAndAnalyze}
                disabled={isDeepLoading}
                className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                {isDeepLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <BrainCircuitIcon className="w-5 h-5" />}
                Analisi Dettagliata con AI
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
  );
};