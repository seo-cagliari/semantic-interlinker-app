import React, { useState } from 'react';
import { PillarRoadmap, ContentBrief, StrategicContext, BridgeArticleSuggestion, TopicalClusterSuggestion } from '../types';
import { MapIcon, NewspaperIcon, BrainCircuitIcon, StarIcon, LoadingSpinnerIcon, XCircleIcon, LinkIcon } from './Icons';
import { ContentBriefModal } from './ContentBriefModal';

interface TopicalAuthorityGeneratorProps {
    onGenerate: (context: StrategicContext) => void;
    isLoading: boolean;
    error: string | null;
    loadingMessage: string;
}

export const TopicalAuthorityGenerator = (props: TopicalAuthorityGeneratorProps) => {
    const { onGenerate, isLoading, error, loadingMessage } = props;
    const [sourceContext, setSourceContext] = useState('');
    const [centralIntent, setCentralIntent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate({ source_context: sourceContext, central_intent: centralIntent });
    };

    if (isLoading) {
        return (
            <div className="text-center py-16 flex flex-col items-center">
                <LoadingSpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generazione della Roadmap in corso...</h3>
                <p className="text-slate-500 max-w-md animate-fade-in-up" key={loadingMessage}>
                    {loadingMessage}
                </p>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="text-center py-12 px-6 bg-red-50 rounded-2xl border border-red-200">
                <XCircleIcon className="w-10 h-10 mx-auto text-red-400 mb-3" />
                <h3 className="text-xl font-bold text-red-800">Errore durante l'analisi</h3>
                <p className="max-w-xl mx-auto text-red-700 mt-2 mb-6 text-sm">{error}</p>
                <button 
                    onClick={handleSubmit}
                    className="bg-slate-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    Riprova
                </button>
             </div>
         );
    }

    return (
        <div className="py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="max-w-2xl mx-auto text-center">
                <MapIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h3 className="text-xl font-bold text-slate-800">Configura il tuo Audit di Topical Authority</h3>
                <p className="text-slate-600 mt-2 mb-6">
                    Definisci il DNA strategico del tuo sito per guidare l'AI. Questo permette di generare una roadmap di contenuti perfettamente allineata ai tuoi obiettivi di business (metodologia "Holistic SEO").
                </p>
            </div>
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-6 space-y-4 text-left">
                <div>
                    <label htmlFor="source-context" className="block text-sm font-semibold text-slate-700 mb-1">1. Contesto Fonte (Source Context)</label>
                    <textarea
                        id="source-context"
                        value={sourceContext}
                        onChange={(e) => setSourceContext(e.target.value)}
                        required
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Descrivi l'obiettivo di business primario del sito. Esempio: 'Vendere consulenze SEO personalizzate a PMI italiane' o 'Diventare il punto di riferimento per le ricette vegane e monetizzare con affiliazioni'."
                    />
                </div>
                <div>
                    <label htmlFor="central-intent" className="block text-sm font-semibold text-slate-700 mb-1">2. Intento di Ricerca Centrale (Central Search Intent)</label>
                     <textarea
                        id="central-intent"
                        value={centralIntent}
                        onChange={(e) => setCentralIntent(e.target.value)}
                        required
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Descrivi l'obiettivo principale che gli utenti vogliono raggiungere. Esempio: 'Trovare soluzioni efficaci per migliorare il posizionamento su Google' o 'Imparare a cucinare piatti vegani gustosi'."
                    />
                </div>
                <div className="text-center pt-4">
                     <button 
                        type="submit"
                        className="bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <BrainCircuitIcon className="w-5 h-5" />
                        Genera Roadmap Strategica
                    </button>
                </div>
            </form>
        </div>
    );
};

const SectionBadge = ({ type }: { type: 'Core' | 'Outer' }) => {
    const isCore = type === 'Core';
    const bgColor = isCore ? 'bg-blue-100' : 'bg-emerald-100';
    const textColor = isCore ? 'text-blue-800' : 'text-emerald-800';
    const dotColor = isCore ? 'bg-blue-500' : 'bg-emerald-500';

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${bgColor} ${textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
            {type} Section
        </span>
    );
};

const ImpactScoreBadge = ({ score, rationale }: { score?: number, rationale?: string }) => {
    if (score === undefined) return null;

    const scoreColor = score >= 8 ? 'text-green-700' : score >= 5 ? 'text-yellow-700' : 'text-slate-600';

    return (
        <div 
            className="relative group flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-slate-200 text-slate-700"
            title={rationale || 'Punteggio di impatto strategico'}
        >
            <StarIcon className={`w-3 h-3 ${scoreColor}`} />
            <span className={scoreColor}>{score.toFixed(1)}/10</span>
            <span className="hidden md:inline">&nbsp;Impatto</span>
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


interface TopicalAuthorityRoadmapProps {
  roadmaps: PillarRoadmap[];
  bridgeSuggestions?: BridgeArticleSuggestion[];
  strategicContext?: StrategicContext;
}

export const TopicalAuthorityRoadmap = (props: TopicalAuthorityRoadmapProps) => {
  const { roadmaps, bridgeSuggestions, strategicContext } = props;
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<ContentBrief | null>(null);

  const handleViewBrief = (brief: ContentBrief | undefined) => {
    if (brief) {
      setSelectedBrief(brief);
      setIsBriefModalOpen(true);
    }
  };

  return (
    <>
      <div className="mt-8">
        <div className="flex items-start gap-3 mb-6">
          <MapIcon className="w-8 h-8 text-slate-500" />
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Topical Authority Roadmap</h2>
              <p className="text-slate-600">
                  Il piano strategico dell'AI, basato sui principi di Holistic SEO, per trasformare il sito in una risorsa autorevole e completa.
              </p>
          </div>
        </div>
        
        {strategicContext && (
             <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                <p><strong className="font-semibold text-slate-600">Contesto Fonte Analizzato:</strong> <span className="text-slate-800">"{strategicContext.source_context}"</span></p>
                <p className="mt-1"><strong className="font-semibold text-slate-600">Intento Centrale Analizzato:</strong> <span className="text-slate-800">"{strategicContext.central_intent}"</span></p>
            </div>
        )}

        <div className="space-y-12">
          {(roadmaps || []).map((pillar, pillarIndex) => (
            <div key={pillar.pillar_name} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${pillarIndex * 150}ms` }}>
              <h3 className="text-2xl font-bold text-blue-700 mb-2 border-b border-slate-200 pb-3">Pillar: {pillar.pillar_name}</h3>
              
              {pillar.existing_pages && pillar.existing_pages.length > 0 && (
                <details className="text-sm my-4 bg-slate-50 p-3 rounded-md border border-slate-200">
                    <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-800">
                        Pagine Esistenti Analizzate per questo Pillar ({pillar.existing_pages.length})
                    </summary>
                    <ul className="list-disc pl-5 mt-2 text-slate-500 text-xs columns-1 sm:columns-2 md:columns-3 gap-x-4">
                        {pillar.existing_pages.map(url => (
                            <li key={url} className="truncate">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" title={url}>
                                    {url.replace(/https?:\/\/[^/]+\//, '/')}
                                </a>
                            </li>
                        ))}
                    </ul>
                </details>
              )}

              <div className="flex items-start gap-3 text-sm text-slate-600 my-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <BrainCircuitIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5"/>
                  <p><strong className="font-semibold text-slate-700">Riepilogo Strategico:</strong> {pillar.strategic_summary}</p>
              </div>

              <h4 className="text-lg font-semibold text-slate-800 mb-4 mt-6">Cluster di Contenuti Mancanti per questo Pillar:</h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...(pillar.cluster_suggestions || [])]
                    .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
                    .map((cluster: TopicalClusterSuggestion, index: number) => (
                  <div 
                    key={index} 
                    className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 flex flex-col" 
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <h5 className="text-lg font-bold text-slate-900 flex-grow">{cluster.cluster_name}</h5>
                        <ImpactScoreBadge score={cluster.impact_score} rationale={cluster.impact_rationale} />
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">{cluster.strategic_rationale}</p>

                    <div className="border-t border-slate-200 pt-3 mt-auto">
                        <h6 className="text-xs font-semibold text-slate-500 uppercase mb-3">Suggerimenti di Articoli</h6>
                        <div className="space-y-3">
                            {(cluster.article_suggestions || []).map((article, articleIndex) => (
                                <div key={articleIndex}>
                                  <div className="w-full text-left p-2 rounded-md">
                                     <div className="flex items-start justify-between">
                                          <div className="flex items-start gap-2">
                                              <NewspaperIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                              <p className="text-sm font-semibold text-slate-800">{article.title}</p>
                                          </div>
                                          <SectionBadge type={article.section_type} />
                                     </div>
                                     <p className="text-xs text-slate-500 mt-1 pl-6">
                                       <span className="font-medium">Query:</span> {article.target_queries.map(q => `"${q}"`).join(', ')}
                                     </p>
                                  </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {bridgeSuggestions && bridgeSuggestions.length > 0 && (
             <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-sm animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-4">
                      <LinkIcon className="w-8 h-8 text-amber-500"/>
                      <h3 className="text-2xl font-bold text-amber-800">Ponti Contestuali</h3>
                  </div>
                  <p className="text-slate-600 mb-6">L'AI ha identificato i seguenti articoli strategici che collegano due Pillar diversi, unificando l'autorità del dominio e dimostrando una competenza olistica.</p>
                   <div className="space-y-4">
                        {bridgeSuggestions.map((bridge, index) => (
                            <div key={index} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="text-xs font-bold uppercase text-slate-600 bg-slate-200 px-2 py-1 rounded-full">{bridge.connecting_pillars[0]}</span>
                                    <LinkIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold uppercase text-slate-600 bg-slate-200 px-2 py-1 rounded-full">{bridge.connecting_pillars[1]}</span>
                                </div>
                                <h4 className="font-bold text-slate-900">{bridge.title}</h4>
                                <p className="text-sm text-slate-600 mt-1">{bridge.description}</p>
                                 <p className="text-xs text-slate-500 mt-2">
                                   <span className="font-medium">Query Target:</span> {bridge.target_queries.map(q => `"${q}"`).join(', ')}
                                 </p>
                            </div>
                        ))}
                   </div>
             </div>
          )}
        </div>
      </div>
      <ContentBriefModal
        isOpen={isBriefModalOpen}
        onClose={() => setIsBriefModalOpen(false)}
        brief={selectedBrief}
      />
    </>
  );
};
