
import React from 'react';
import { ContentGapSuggestion } from '../types';
import { LightBulbIcon, SignalIcon, ShieldCheckIcon, BeakerIcon, StarIcon } from './Icons';

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

const CommercialOpportunityBadge = ({ score, rationale }: { score?: number, rationale?: string }) => {
    if (score === undefined) return null;

    const scoreColor = score >= 8 ? 'text-green-700' : score >= 5 ? 'text-yellow-700' : 'text-slate-600';

    return (
        <div 
            className="relative group flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-slate-200 text-slate-700"
            title={rationale || 'Punteggio di opportunità commerciale'}
        >
            <StarIcon className={`w-3 h-3 ${scoreColor}`} />
            <span className={scoreColor}>{score.toFixed(1)}/10</span>
            <span className="hidden md:inline">&nbsp;Opportunità</span>
            {rationale && (
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 rounded-md shadow-lg bg-slate-800 text-white text-xs z-10 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none">
                    {rationale}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
            )}
        </div>
    );
};

export const ContentGapAnalysis = (props: ContentGapAnalysisProps) => {
  const { suggestions } = props;
  const sortedSuggestions = [...(suggestions || [])].sort((a, b) => (b.commercial_opportunity_score || 0) - (a.commercial_opportunity_score || 0));

  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-4">
        <LightBulbIcon className="w-8 h-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-slate-800">Opportunità di Contenuto (Content Gap)</h2>
      </div>
      <p className="text-slate-600 mb-6">
        L'AI ha identificato e prioritizzato i seguenti argomenti mancanti in base al loro potenziale impatto commerciale. Creare contenuti su questi temi può rafforzare i cluster tematici e supportare gli obiettivi di business.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedSuggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up flex flex-col justify-between" 
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-bold uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{suggestion.relevant_cluster}</span>
                    <CommercialOpportunityBadge score={suggestion.commercial_opportunity_score} rationale={suggestion.commercial_opportunity_rationale} />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{suggestion.title}</h3>
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