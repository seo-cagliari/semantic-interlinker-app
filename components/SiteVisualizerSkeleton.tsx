import React from 'react';
import { LoadingSpinnerIcon } from './Icons';

export const SiteVisualizerSkeleton = () => (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-lg relative h-[70vh] flex items-center justify-center animate-fade-in-up">
        <div className="text-center">
            <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Caricamento visualizzatore...</p>
            <p className="text-slate-500 text-sm mt-1">L'architettura del sito è in fase di rendering.</p>
        </div>
    </div>
);