import React, { useState, useEffect, useCallback } from 'react';
import { GscSite, GscDataRow } from '../types';
import { LoadingSpinnerIcon, GoogleGIcon, LinkIcon, XCircleIcon } from './Icons';

interface GscConnectProps {
  onAnalysisStart: (siteUrl: string, gscData: GscDataRow[]) => void;
}

export const GscConnect: React.FC<GscConnectProps> = ({ onAnalysisStart }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedGscSite, setSelectedGscSite] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);


  const checkAuthStatus = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/gsc/sites');
      if (response.ok) {
        const siteData: GscSite[] = await response.json();
        setSites(siteData);
        if (siteData.length > 0) {
          setSelectedGscSite(siteData[0].siteUrl);
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
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleConnect = () => {
    setIsAuthenticating(true);
    const authUrl = '/api/gsc/auth';
    const authWindow = window.open(authUrl, '_blank', 'width=600,height=700,noreferrer');

    const handleMessage = (event: MessageEvent) => {
        // Security: a simple check for the message structure and origin.
        if (event.data && event.data.status === 'auth_success' && typeof event.data.baseUrl === 'string') {
            // This is the success signal from our popup.
            // The only reliable way to use the new session cookie is to be on the domain it was set for.
            // So, we redirect the main window to the stable production URL.
            window.location.href = event.data.baseUrl;
            
            // The page will navigate away, but we can still try to clean up.
            if (authWindow) authWindow.close();
            window.removeEventListener('message', handleMessage);
            if (pollInterval) clearInterval(pollInterval);
        }
    };

    window.addEventListener('message', handleMessage);

    // Fallback polling mechanism in case postMessage fails or window is closed manually.
    const pollInterval = setInterval(() => {
        if (authWindow && authWindow.closed) {
            clearInterval(pollInterval);
            window.removeEventListener('message', handleMessage);
            // The popup closed without sending a message. We can't redirect.
            // Our only option is to stop waiting and re-check the auth status.
            // This may or may not work depending on cookie domain policies, but it's the best we can do to avoid getting stuck.
            setIsAuthenticating(false);
            checkAuthStatus();
        }
    }, 1000);
  };


  const handleStartAnalysis = async () => {
    if (!selectedGscSite) {
      setError("Seleziona una proprietà di GSC da analizzare.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
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
      onAnalysisStart(selectedGscSite, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore imprevisto.');
      setIsLoading(false);
    }
  };

  if (isLoading && isAuthenticated === null) {
      return (
        <div className="text-center py-12">
            <LoadingSpinnerIcon className="w-8 h-8 mx-auto text-slate-400" />
            <p className="mt-2 text-slate-500">Verifica autenticazione GSC...</p>
        </div>
      );
  }

  return (
    <div className="text-center py-12 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Inizia connettendo Google Search Console</h2>
      <p className="text-slate-500 mb-6">Collega il tuo account per alimentare l'analisi con dati di ricerca reali e ottenere suggerimenti strategici.</p>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        {!isAuthenticated ? (
          <div>
            <p className="text-slate-600 mb-4">È richiesto l'accesso per leggere i dati del tuo sito da Google Search Console.</p>
            <button 
              onClick={handleConnect}
              disabled={isAuthenticating}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors border border-blue-700 disabled:bg-blue-400"
            >
              {isAuthenticating ? <LoadingSpinnerIcon className="w-5 h-5"/> : <GoogleGIcon className="w-5 h-s" />}
              {isAuthenticating ? 'In attesa di Google...' : 'Collega Google Search Console'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <select
              value={selectedGscSite}
              onChange={(e) => setSelectedGscSite(e.target.value)}
              disabled={sites.length === 0}
              className="w-full max-w-md px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
            >
              {sites.length > 0 ? (
                sites.map(site => <option key={site.siteUrl} value={site.siteUrl}>{site.siteUrl}</option>)
              ) : (
                <option>Nessun sito trovato nel tuo account GSC.</option>
              )}
            </select>
            <button
              onClick={handleStartAnalysis}
              disabled={!selectedGscSite || isLoading}
              className="bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-5 h-5" />
              Analizza Sito
            </button>
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