'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinnerIcon, CheckCircleIcon, XCircleIcon } from '../../components/Icons';

enum Status {
  PENDING,
  SUCCESS,
  ERROR,
}

export const GscAuthCompleteClient: React.FC = () => {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setError('Codice di autorizzazione mancante.');
      setStatus(Status.ERROR);
      return;
    }

    const exchangeToken = async () => {
      try {
        const response = await fetch('/api/gsc/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Scambio del token fallito.');
        }
        
        setStatus(Status.SUCCESS);
        // Close the window after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto.');
        setStatus(Status.ERROR);
      }
    };

    exchangeToken();
  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case Status.PENDING:
        return (
          <>
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
            <h1 className="text-xl font-semibold text-slate-800">Finalizzazione dell'autenticazione...</h1>
            <p className="text-slate-500">Sto verificando le credenziali con Google.</p>
          </>
        );
      case Status.SUCCESS:
        return (
          <>
            <CheckCircleIcon className="w-12 h-12 text-green-500 mb-4" />
            <h1 className="text-xl font-semibold text-slate-800">Autenticazione Riuscita!</h1>
            <p className="text-slate-500">Questa finestra si chiuderà tra poco.</p>
          </>
        );
      case Status.ERROR:
        return (
          <>
            <XCircleIcon className="w-12 h-12 text-red-500 mb-4" />
            <h1 className="text-xl font-semibold text-slate-800">Autenticazione Fallita</h1>
            <p className="text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
            <p className="text-slate-500 mt-4">Puoi chiudere questa finestra e riprovare.</p>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-sm">
        {renderContent()}
      </div>
    </div>
  );
};
