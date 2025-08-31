import React from 'react';
import { DeepAnalysisReport } from '../types';
import { ArrowDownLeftIcon, ArrowUpRightIcon, SparklesIcon, LinkIcon } from './Icons';

interface DeepAnalysisReportDisplayProps {
  report: DeepAnalysisReport;
}

export const DeepAnalysisReportDisplay: React.FC<DeepAnalysisReportDisplayProps> = ({ report }) => {
  const score = report.authority_score;
  const scoreColorClass = score > 7 ? 'text-green-700 bg-green-100 border-green-200' : score > 4 ? 'text-yellow-700 bg-yellow-100 border-yellow-200' : 'text-slate-700 bg-slate-100 border-slate-200';

  return (
    <div className="mt-8 mb-12 animate-fade-in-up">
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">Risultati Analisi Approfondita</h2>
        <div className="text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Pagina analizzata: <a href={report.analyzed_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium break-all">{report.analyzed_url}</a></span>
            <span className={`px-2 py-0.5 rounded-full text-sm font-bold border ${scoreColorClass}`}>
              Autorità: {score.toFixed(2)}/10
            </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* INBOUND LINKS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ArrowDownLeftIcon className="w-7 h-7 text-green-500" />
            <h3 className="text-xl font-semibold text-slate-900">Link in Entrata Suggeriti</h3>
          </div>
          <p className="text-sm text-slate-500">Pagine che dovrebbero collegarsi a <span className="font-semibold">questa pagina</span> per aumentarne l'autorità.</p>
          <div className="space-y-4">
            {report.inbound_links.map((link, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-2">
                  DA: <a href={link.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{link.source_url}</a>
                </p>
                <p className="font-semibold text-slate-800">Anchor: <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{link.proposed_anchor}</span></p>
                <p className="text-xs text-slate-600 mt-2 italic">"{link.semantic_rationale}"</p>
              </div>
            ))}
             {report.inbound_links.length === 0 && <p className="text-sm text-slate-400 italic">Nessun suggerimento di link in entrata ad alta priorità trovato.</p>}
          </div>
        </div>

        {/* OUTBOUND LINKS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ArrowUpRightIcon className="w-7 h-7 text-blue-500" />
            <h3 className="text-xl font-semibold text-slate-900">Link in Uscita Suggeriti</h3>
          </div>
           <p className="text-sm text-slate-500"><span className="font-semibold">Questa pagina</span> dovrebbe collegarsi a queste risorse interne per arricchire il contenuto.</p>
          <div className="space-y-4">
            {report.outbound_links.map((link, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                 <p className="text-sm text-slate-500 mb-2">
                  A: <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{link.target_url}</a>
                </p>
                <p className="font-semibold text-slate-800">Anchor: <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{link.proposed_anchor}</span></p>
                <p className="text-xs text-slate-600 mt-2 italic">"{link.semantic_rationale}"</p>
              </div>
            ))}
            {report.outbound_links.length === 0 && <p className="text-sm text-slate-400 italic">Nessun suggerimento di link in uscita ad alta priorità trovato.</p>}
          </div>
        </div>

        {/* CONTENT ENHANCEMENTS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-7 h-7 text-yellow-500" />
            <h3 className="text-xl font-semibold text-slate-900">Miglioramenti del Contenuto</h3>
          </div>
          <p className="text-sm text-slate-500">Suggerimenti per arricchire il testo di <span className="font-semibold">questa pagina</span> e aumentarne la completezza.</p>
          <div className="space-y-4">
            {report.content_enhancements.map((enhancement, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800">{enhancement.suggestion_title}</h4>
                <p className="text-sm text-slate-600 mt-1">{enhancement.description}</p>
              </div>
            ))}
             {report.content_enhancements.length === 0 && <p className="text-sm text-slate-400 italic">Nessun suggerimento per migliorare il contenuto trovato.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};