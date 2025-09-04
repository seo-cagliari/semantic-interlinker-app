import React from 'react';
import { OpportunityPage } from '../types';
import { BrainCircuitIcon, ChartBarIcon } from './Icons';

interface OpportunityHubProps {
  pages: OpportunityPage[];
  onAnalyze: (url: string) => void;
}

export const OpportunityHub: React.FC<OpportunityHubProps> = ({ pages, onAnalyze }) => {
  return (
    <div className="mb-16">
      <div className="flex items-center gap-3 mb-4">
        <ChartBarIcon className="w-8 h-8 text-blue-500" />
        <h2 className="text-2xl font-bold text-slate-800">Content Performance & Opportunity Hub</h2>
      </div>
      <p className="text-slate-600 mb-6">
        L'AI ha analizzato i dati di GSC per identificare le pagine con il maggior potenziale di crescita inespresso (alte impressioni, basso CTR). Concentra i tuoi sforzi qui per ottenere i risultati più rapidi.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Punteggio Opportunità
                </th>
                <th scope="col" className="px-6 py-3">
                  Pagina
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Impressioni Totali
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  CTR Medio
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Azione
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page, index) => (
                <tr key={page.url} className="bg-white border-b hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-blue-600">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{(index + 1)}.</span>
                        <span>{Math.round(page.opportunity_score).toLocaleString('it-IT')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="hover:underline" title={page.url}>
                        {page.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {page.total_impressions.toLocaleString('it-IT')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(page.average_ctr * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                        onClick={() => onAnalyze(page.url)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-xs flex items-center justify-center gap-1 mx-auto"
                    >
                        <BrainCircuitIcon className="w-4 h-4" />
                        Analizza
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};