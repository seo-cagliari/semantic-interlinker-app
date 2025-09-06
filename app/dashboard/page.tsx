'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { BrainCircuitIcon, LoadingSpinnerIcon } from '../../components/Icons';

const DashboardClient = dynamic(
  () => import('../../components/DashboardClient'),
  {
    ssr: false,
    loading: () => (
       <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Caricamento dashboard interattiva...</p>
            <p className="text-slate-500 text-sm mt-1">L'interfaccia è in fase di inizializzazione sul client.</p>
          </div>
        </div>
    ),
  }
);

export default function DashboardPageShell() {
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
          <DashboardClient />
        </main>
      </div>
    </div>
  );
}
