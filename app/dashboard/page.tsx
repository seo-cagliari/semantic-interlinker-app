'use client';

import React, { useState, useEffect } from 'react';
import DashboardClient from '../../components/DashboardClient';
import { BrainCircuitIcon, LoadingSpinnerIcon } from '../../components/Icons';

const LoadingSkeleton = () => (
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
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Caricamento dashboard...</p>
            <p className="text-slate-500 text-sm mt-1">L'interfaccia interattiva è in fase di inizializzazione.</p>
          </div>
        </div>
      </main>
    </div>
  </div>
);

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <LoadingSkeleton />;
  }

  return <DashboardClient />;
}