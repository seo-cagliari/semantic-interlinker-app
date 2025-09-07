


import React, { useState } from 'react';
import { PillarRoadmap, ContentBrief } from '../types';
import { MapIcon, NewspaperIcon, BrainCircuitIcon, StarIcon, LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { ContentBriefModal } from './ContentBriefModal';

interface TopicalAuthorityGeneratorProps {
    onGenerate: () => void;
    isLoading: boolean;
    error: string | null;
    loadingMessage: string;
}

export const TopicalAuthorityGenerator = (props: TopicalAuthorityGeneratorProps) => {
    const { onGenerate, isLoading, error, loadingMessage } = props;

    const handleSubmit = () => {
        onGenerate();
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
        <div className="text-center py-12 px-6 bg-slate-50 rounded-2xl border border-slate-200">
            <MapIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-xl font-bold text-slate-800">Sblocca la tua Topical Authority Roadmap</h3>
            <p className="max-w-2xl mx-auto text-slate-600 mt-2 mb-6">
                Avvia un'analisi strategica approfondita. L'AI identificherà autonomamente i "Pillar" tematici del tuo sito, costruirà una mappa ideale per ciascuno e identificherà i gap di contenuto per fornirti una roadmap completa.
            </p>
            <button 
                onClick={handleSubmit}
                className="mt-6 bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
                <BrainCircuitIcon className="w-5 h-5" />
                Genera Roadmap Strategica
            </button>
        </div>
    );
};


interface TopicalAuthorityRoadmapProps {
  roadmaps: PillarRoadmap[];
}

export const TopicalAuthorityRoadmap = (props: TopicalAuthorityRoadmapProps) => {
  const { roadmaps } = props;
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
                  Il piano strategico dell'AI, suddiviso per Pillar tematici, per trasformare il sito in una risorsa autorevole e completa.
              </p>
          </div>
        </div>

        <div className="space-y-12">
          {(roadmaps || []).map((pillar, pillarIndex) => (
            <div key={pillar.pillar_name} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${pillarIndex * 150}ms` }}>
              <h3 className="text-2xl font-bold text-blue-700 mb-2 border-b border-slate-200 pb-3">Pillar: {pillar.pillar_name}</h3>
              
              <div className="flex items-start gap-3 text-sm text-slate-600 my-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <BrainCircuitIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5"/>
                  <p><strong className="font-semibold text-slate-700">Riepilogo Strategico:</strong> {pillar.strategic_summary}</p>
              </div>

              <h4 className="text-lg font-semibold text-slate-800 mb-4 mt-6">Cluster di Contenuti Mancanti per questo Pillar:</h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(pillar.cluster_suggestions || []).map((cluster, index) => (
                  <div 
                    key={index} 
                    className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 flex flex-col" 
                  >
                    <div className="flex justify-between items-start mb-2">
                        <h5 className="text-lg font-bold text-slate-900 flex-grow pr-4">{cluster.cluster_name}</h5>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">{cluster.strategic_rationale}</p>

                    <div className="border-t border-slate-200 pt-3 mt-auto">
                        <h6 className="text-xs font-semibold text-slate-500 uppercase mb-3">Suggerimenti di Articoli</h6>
                        <div className="space-y-3">
                            {(cluster.article_suggestions || []).map((article, articleIndex) => (
                                <div key={articleIndex}>
                                  <div className="w-full text-left p-2 rounded-md">
                                     <div className="flex items-start gap-2">
                                          <NewspaperIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                          <p className="text-sm font-semibold text-slate-800">{article.title}</p>
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