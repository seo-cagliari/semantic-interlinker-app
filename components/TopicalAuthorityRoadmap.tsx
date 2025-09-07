

import React, { useState } from 'react';
import { TopicalAuthorityRoadmap as TopicalAuthorityRoadmapType, ContentBrief } from '../types';
import { MapIcon, NewspaperIcon, BrainCircuitIcon, StarIcon, LoadingSpinnerIcon, XCircleIcon } from './Icons';
import { ContentBriefModal } from './ContentBriefModal';

interface TopicalAuthorityGeneratorProps {
    onGenerate: (serpApiKey: string) => void;
    isLoading: boolean;
    error: string | null;
    loadingMessage: string;
    initialApiKey: string;
}

export const TopicalAuthorityGenerator = (props: TopicalAuthorityGeneratorProps) => {
    const { onGenerate, isLoading, error, loadingMessage, initialApiKey } = props;
    const [serpApiKey, setSerpApiKey] = useState(initialApiKey);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = () => {
        setFormError(null);
        if (!serpApiKey.trim()) {
            setFormError("La chiave API per l'analisi SERP è obbligatoria.");
            return;
        }
        onGenerate(serpApiKey);
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
                Avvia un'analisi strategica basata sui dati della SERP. L'AI identificherà autonomamente l'argomento principale del tuo sito. Fornisci una chiave API di <a href="https://serpapi.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">SerpApi</a> per analizzare i tuoi competitor in tempo reale.
            </p>
            <div className="max-w-lg mx-auto space-y-4 text-left">
                 <div>
                    <label htmlFor="serpApiKey" className="block text-sm font-medium text-slate-700 mb-1">Chiave API SerpApi</label>
                    <input 
                        type="password" 
                        id="serpApiKey"
                        value={serpApiKey}
                        onChange={(e) => setSerpApiKey(e.target.value)}
                        placeholder="Incolla qui la tua chiave API"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    />
                </div>
            </div>
             {formError && <p className="text-red-600 text-sm mt-3">{formError}</p>}
            <button 
                onClick={handleSubmit}
                className="mt-6 bg-slate-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
                <BrainCircuitIcon className="w-5 h-5" />
                Genera Audit Completo della Topical Authority
            </button>
        </div>
    );
};


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
                  <h3 className="text-sm font-semibold uppercase text-slate-500 mb-1">Argomento Principale Analizzato</h3>
                  <p className="text-lg font-bold text-blue-700">{roadmap.main_topic}</p>
              </div>
              <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Punteggio Copertura (vs SERP)</h3>
                  <div className="flex items-center gap-3">
                      <CoverageMeter score={roadmap.coverage_score} />
                      <span className="font-bold text-lg text-slate-800">{roadmap.coverage_score}/100</span>
                  </div>
              </div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Cluster di Contenuti Mancanti (Gap vs Competitor):</h3>
        
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