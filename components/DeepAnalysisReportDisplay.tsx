
import React from 'react';
import { DeepAnalysisReport, ActionStep } from '../types';
import { ArrowDownLeftIcon, ArrowUpRightIcon, SparklesIcon, ChartBarIcon, BrainCircuitIcon, CheckCircleIcon } from './Icons';

interface DeepAnalysisReportDisplayProps {
  report: DeepAnalysisReport;
}

interface PriorityIndicatorProps {
    priority: ActionStep['priority'];
}

const PriorityIndicator = (props: PriorityIndicatorProps) => {
    const { priority } = props;
    const priorityMap = {
        'Alta': {
            icon: <div className="w-2 h-2 rounded-full bg-red-500"></div>,
            text: 'Alta',
            textColor: 'text-red-700'
        },
        'Media': {
            icon: <div className="w-2 h-2 rounded-full bg-yellow-500"></div>,
            text: 'Media',
            textColor: 'text-yellow-700'
        },
        'Bassa': {
            icon: <div className="w-2 h-2 rounded-full bg-green-500"></div>,
            text: 'Bassa',
            textColor: 'text-green-700'
        }
    };
    const { icon, text, textColor } = priorityMap[priority] || priorityMap['Media'];

    return (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
            {icon}
            {text}
        </div>
    );
};


export const DeepAnalysisReportDisplay = (props: DeepAnalysisReportDisplayProps) => {
  const { report } = props;
  const score = report.authority_score;
  const scoreColorClass = score > 7 ? 'text-green-700 bg-green-100 border-green-200' : score > 4 ? 'text-yellow-700 bg-yellow-100 border-yellow-200' : 'text-slate-700 bg-slate-100 border-slate-200';

  const { action_plan } = report;

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

      {action_plan && (
         <div className="mb-10 p-5 rounded-xl border border-blue-200 bg-blue-50/50">
           <div className="flex items-start gap-3 mb-3">
            <BrainCircuitIcon className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
                <h3 className="text-xl font-semibold text-slate-900">Piano d'Azione Strategico del "SEO Coach"</h3>
                <p className="text-sm text-blue-700 mt-1">{action_plan.executive_summary}</p>
            </div>
          </div>
           
           <div className="mt-4 border-t border-blue-200 pt-4">
               <h4 className="font-semibold text-slate-800 mb-3">Checklist Strategica:</h4>
               <div className="space-y-3">
                   {(action_plan.strategic_checklist || []).map((step, index) => (
                       <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200">
                           <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                           <div className="flex-grow">
                               <div className="flex justify-between items-start">
                                   <h5 className="font-semibold text-slate-800">{step.title}</h5>
                                   <PriorityIndicator priority={step.priority} />
                               </div>
                               <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        </div>
      )}
      
      {report.opportunity_queries && report.opportunity_queries.length > 0 && (
        <div className="mb-8 p-5 rounded-xl border border-slate-200 bg-slate-50">
           <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="w-7 h-7 text-slate-500" />
            <h3 className="text-xl font-semibold text-slate-900">Dettagli: Opportunità dai Dati di Ricerca (GSC)</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">L'AI ha identificato queste query con alte impressioni ma basso CTR come opportunità per migliorare i contenuti e il linking.</p>
          <div className="flex flex-wrap gap-2">
            {(report.opportunity_queries || []).map((q, i) => (
                <div key={i} className="bg-white text-xs text-slate-700 px-2 py-1 rounded-md border border-slate-200">
                    <span className="font-semibold text-blue-800">"{q.query}"</span> (Imp: {q.impressions.toLocaleString()}, CTR: {(q.ctr * 100).toFixed(2)}%)
                </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* INBOUND LINKS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ArrowDownLeftIcon className="w-7 h-7 text-green-500" />
            <h3 className="text-xl font-semibold text-slate-900">Dettagli: Link in Entrata</h3>
          </div>
          <p className="text-sm text-slate-500">Pagine che dovrebbero collegarsi a <span className="font-semibold">questa pagina</span> per supportare il piano strategico.</p>
          <div className="space-y-4">
            {(report.inbound_links || []).map((link, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 mb-2">
                  DA: <a href={link.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{link.source_url}</a>
                </p>
                <p className="font-semibold text-slate-800">Anchor: <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{link.proposed_anchor}</span></p>
                {link.driving_query && (
                    <p className="text-xs text-slate-500 mt-2">
                        <span className="font-semibold">Query GSC:</span> "{link.driving_query}"
                    </p>
                )}
                <p className="text-xs text-slate-600 mt-2 italic">"{link.semantic_rationale}"</p>
              </div>
            ))}
             {(!report.inbound_links || report.inbound_links.length === 0) && <p className="text-sm text-slate-400 italic">Nessun suggerimento di link in entrata ad alta priorità trovato.</p>}
          </div>
        </div>

        {/* OUTBOUND LINKS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ArrowUpRightIcon className="w-7 h-7 text-blue-500" />
            <h3 className="text-xl font-semibold text-slate-900">Dettagli: Link in Uscita</h3>
          </div>
           <p className="text-sm text-slate-500"><span className="font-semibold">Questa pagina</span> dovrebbe collegarsi a queste risorse interne per arricchire il contenuto.</p>
          <div className="space-y-4">
            {(report.outbound_links || []).map((link, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                 <p className="text-sm text-slate-500 mb-2">
                  A: <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">{link.target_url}</a>
                </p>
                <p className="font-semibold text-slate-800">Anchor: <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{link.proposed_anchor}</span></p>
                <p className="text-xs text-slate-600 mt-2 italic">"{link.semantic_rationale}"</p>
              </div>
            ))}
            {(!report.outbound_links || report.outbound_links.length === 0) && <p className="text-sm text-slate-400 italic">Nessun suggerimento di link in uscita ad alta priorità trovato.</p>}
          </div>
        </div>

        {/* CONTENT ENHANCEMENTS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-7 h-7 text-yellow-500" />
            <h3 className="text-xl font-semibold text-slate-900">Dettagli: Miglioramenti Contenuto</h3>
          </div>
          <p className="text-sm text-slate-500">Suggerimenti per arricchire il testo di <span className="font-semibold">questa pagina</span> e aumentarne la completezza.</p>
          <div className="space-y-4">
            {(report.content_enhancements || []).map((enhancement, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800">{enhancement.suggestion_title}</h4>
                <p className="text-sm text-slate-600 mt-1">{enhancement.description}</p>
              </div>
            ))}
             {(!report.content_enhancements || report.content_enhancements.length === 0) && <p className="text-sm text-slate-400 italic">Nessun suggerimento per migliorare il contenuto trovato.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};
