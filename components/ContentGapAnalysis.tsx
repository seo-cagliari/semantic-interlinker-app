import React from 'react';
import { ContentGapSuggestion } from '../types';
import { LightBulbIcon, SignalIcon, ShieldCheckIcon, BeakerIcon } from './Icons';

interface ContentGapAnalysisProps {
  suggestions: ContentGapSuggestion[];
}

interface MetricProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    colorClass?: string;
}

const Metric = (props: MetricProps) => {
    const { icon, label, value, colorClass = 'text-slate-700' } = props;
    return (
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs text-slate-500">{label}:</span>
          <span className={`text-xs font-bold ${colorClass}`}>{value}</span>
        </div>
    );
};

export const ContentGapAnalysis = (props: ContentGapAnalysisProps) => {
  const { suggestions } = props;
  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-4">
        <LightBulbIcon className="w-8 h-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-slate-800">Opportunità di Contenuto (Content Gap)</h2>
      </div>
      <p className="text-slate-600 mb-6">
        L'AI ha identificato i seguenti argomenti mancanti. Creare contenuti su questi temi può rafforzare i tuoi cluster tematici e aumentare l'autorità del sito.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(suggestions || []).map((suggestion, index) => (
          <div 
            key={index} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up flex flex-col justify-between" 
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div>
                <span className="text-xs font-bold uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{suggestion.relevant_cluster}</span>
                <h3 className="font-bold text-slate-900 mt-3 mb-2 text-lg">{suggestion.title}</h3>
                <p className="text-sm text-slate-600">{suggestion.description}</p>
                 {suggestion.target_query && (
                    <p className="text-xs text-slate-500 mt-2">
                        Query Target: <span className="font-semibold text-slate-700">"{suggestion.target_query}"</span>
                    </p>
                 )}
            </div>
            
            {suggestion.search_volume !== undefined && (
                <div className="mt-4 border-t border-slate-200 pt-3 flex flex-wrap gap-x-4 gap-y-2">
                    <Metric 
                        icon={<SignalIcon className="w-4 h-4 text-slate-400" />}
                        label="Volume"
                        value={suggestion.search_volume.toLocaleString('it-IT')}
                    />
                    <Metric 
                        icon={<ShieldCheckIcon className="w-4 h-4 text-slate-400" />}
                        label="Difficoltà"
                        value={`${suggestion.keyword_difficulty || 0}/100`}
                        colorClass={ (suggestion.keyword_difficulty || 0) > 60 ? 'text-red-600' : (suggestion.keyword_difficulty || 0) > 40 ? 'text-yellow-600' : 'text-green-600'}
                    />
                     <Metric 
                        icon={<BeakerIcon className="w-4 h-4 text-slate-400" />}
                        label="Intent"
                        value={suggestion.search_intent || 'N/A'}
                    />
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};