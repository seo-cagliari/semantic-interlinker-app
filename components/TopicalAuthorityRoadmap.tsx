
import React, { useState } from 'react';
import { TopicalAuthorityRoadmap as TopicalAuthorityRoadmapType, ContentBrief } from '../types';
import { MapIcon, NewspaperIcon, BrainCircuitIcon, StarIcon } from './Icons';
import { ContentBriefModal } from './ContentBriefModal';

interface TopicalAuthorityRoadmapProps {
  roadmap: TopicalAuthorityRoadmapType;
}

const CoverageMeter = ({ score }: { score: number }) => {
  const percentage = Math.max(0, Math.min(100, score));
  let colorClass = 'bg-red-500';
  if (percentage > 75) {
    colorClass = 'bg-green-500';
  } else if (percentage > 40) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
      <div
        className={`${colorClass} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export const TopicalAuthorityRoadmap = (props: TopicalAuthorityRoadmapProps) => {
  const { roadmap } = props;
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
        <div className="flex items-start gap-3 mb-4">
          <MapIcon className="w-8 h-8 text-slate-500" />
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Topical Authority Roadmap</h2>
              <p className="text-slate-600">
                  Il piano strategico dell'AI per trasformare il sito in una risorsa autorevole e completa.
              </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold uppercase text-slate-500 mb-1">Argomento Principale Identificato</h3>
                  <p className="text-lg font-bold text-blue-700">{roadmap.main_topic}</p>
              </div>
              <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Punteggio Copertura Attuale</h3>
                  <div className="flex items-center gap-3">
                      <CoverageMeter score={roadmap.coverage_score} />
                      <span className="font-bold text-lg text-slate-800">{roadmap.coverage_score}/100</span>
                  </div>
              </div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Cluster di Contenuti Mancanti:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(roadmap.cluster_suggestions || []).map((cluster, index) => (
            <div 
              key={index} 
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up flex flex-col" 
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-slate-900 flex-grow pr-4">{cluster.cluster_name}</h4>
                  {cluster.impact_score && (
                      <div className="flex-shrink-0 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" title={cluster.impact_rationale}>
                          <StarIcon className="w-4 h-4 text-yellow-500" />
                          <span>Impatto: {cluster.impact_score.toFixed(1)}/10</span>
                      </div>
                  )}
              </div>
              
              <div className="flex items-start gap-2 text-sm text-slate-600 mb-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <BrainCircuitIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5"/>
                  <p><strong className="font-semibold text-slate-700">Motivazione Strategica:</strong> {cluster.strategic_rationale}</p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-3">Suggerimenti di Articoli</h5>
                  <div className="space-y-3">
                      {(cluster.article_suggestions || []).map((article, articleIndex) => (
                          <div key={articleIndex}>
                            <button
                                onClick={() => handleViewBrief(article.content_brief)}
                                disabled={!article.content_brief}
                                className="w-full text-left p-2 rounded-md hover:bg-blue-50 transition-colors disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            >
                               <div className="flex items-start gap-2">
                                    <NewspaperIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold text-slate-800">{article.title}</p>
                               </div>
                               <p className="text-xs text-slate-500 mt-1 pl-6">
                                 <span className="font-medium">Query:</span> {article.target_queries.map(q => `"${q}"`).join(', ')}
                               </p>
                               {article.content_brief && <span className="text-xs text-blue-600 pl-6 mt-1 block font-semibold">Visualizza brief del contenuto &rarr;</span>}
                            </button>
                          </div>
                      ))}
                  </div>
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