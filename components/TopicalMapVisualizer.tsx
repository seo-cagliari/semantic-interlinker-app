import React from 'react';
import { PillarRoadmap } from '../types';
import { BrainCircuitIcon, StarIcon, NewspaperIcon } from './Icons';

interface TopicalMapVisualizerProps {
  roadmaps?: PillarRoadmap[];
}

export const TopicalMapVisualizer = (props: TopicalMapVisualizerProps) => {
    const { roadmaps } = props;

    return (
        <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in-up">
            <div className="flex items-start gap-3 mb-4">
                <BrainCircuitIcon className="w-8 h-8 text-slate-500" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mappa Visuale della Topical Authority</h2>
                    <p className="text-slate-600">Una vista gerarchica della roadmap di contenuti strategici per il tuo sito.</p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-6">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300"></div>
                    <span className="font-semibold text-slate-600">Articolo 'Core' (Commerciale)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300"></div>
                    <span className="font-semibold text-slate-600">Articolo 'Outer' (Informativo)</span>
                </div>
            </div>

            <div className="space-y-4 font-sans">
                {/* Site Root */}
                <div className="flex items-center">
                    <div className="text-lg font-bold text-slate-900">Tuosito.com</div>
                </div>

                {/* Pillar Level */}
                <div className="pl-6 space-y-4">
                    {(roadmaps || []).map(pillar => (
                        <div key={pillar.pillar_name} className="relative">
                            <div className="absolute -left-6 top-2 w-5 h-px bg-slate-300"></div>
                            <div className="absolute -left-6 top-2 w-px h-full bg-slate-300"></div>
                            <div className="flex items-start">
                                <div className="text-xl font-bold text-blue-700">{pillar.pillar_name}</div>
                            </div>
                            
                            {/* Cluster Level */}
                            <div className="pl-6 mt-2 space-y-3">
                                {[...(pillar.cluster_suggestions || [])]
                                  .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
                                  .map(cluster => (
                                    <div key={cluster.cluster_name} className="relative">
                                        <div className="absolute -left-6 top-2 w-5 h-px bg-slate-300"></div>
                                        <div className="absolute -left-6 top-2 w-px h-full bg-slate-300"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg font-semibold text-slate-800">{cluster.cluster_name}</div>
                                            {cluster.impact_score !== undefined && (
                                                <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600" title={cluster.impact_rationale}>
                                                    <StarIcon className="w-3 h-3" />
                                                    {cluster.impact_score.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Article Level */}
                                        <div className="pl-6 mt-2 space-y-2">
                                            {(cluster.article_suggestions || []).map(article => {
                                                const isCore = article.section_type === 'Core';
                                                const bgColor = isCore ? 'bg-blue-50' : 'bg-emerald-50';
                                                const borderColor = isCore ? 'border-blue-200' : 'border-emerald-200';
                                                
                                                return (
                                                    <div key={article.title} className="relative">
                                                        <div className="absolute -left-6 top-4 w-5 h-px bg-slate-300"></div>
                                                        <div className={`flex items-start gap-2 p-2 rounded-md border ${borderColor} ${bgColor}`}>
                                                          <NewspaperIcon className="w-4 h-4 shrink-0 text-slate-500 mt-1"/>
                                                          <div>
                                                              <p className="text-sm font-medium text-slate-900">{article.title}</p>
                                                              <p className="text-xs text-slate-500 mt-1">{article.target_queries.map(q => `"${q}"`).join(', ')}</p>
                                                          </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};