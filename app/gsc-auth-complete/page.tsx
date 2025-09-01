import React, { Suspense } from 'react';
import { GscAuthCompleteClient } from './GscAuthCompleteClient';
import { LoadingSpinnerIcon } from '../../components/Icons';

// Questo componente funge da segnaposto di caricamento mentre attendiamo
// che il componente client sia pronto.
const AuthLoading = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-sm">
        <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
        <h1 className="text-xl font-semibold text-slate-800">Finalizzazione dell'autenticazione...</h1>
        <p className="text-slate-500">Sto verificando le credenziali con Google.</p>
      </div>
    </div>
);

// La pagina principale è ora un Server Component che usa Suspense
// per caricare in modo sicuro il componente client.
const GscAuthCompletePage = () => {
  return (
    <Suspense fallback={<AuthLoading />}>
      <GscAuthCompleteClient />
    </Suspense>
  );
};

export default GscAuthCompletePage;
