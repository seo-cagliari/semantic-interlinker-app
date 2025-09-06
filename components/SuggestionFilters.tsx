
import React from 'react';
import { ThematicCluster } from '../types';
import { FunnelIcon } from './Icons';

export interface Filters {
    minScore: number;
    cluster: string;
    risk: 'all' | 'with' | 'without';
}

interface SuggestionFiltersProps {
    filters: Filters;
    onFiltersChange: (newFilters: Filters) => void;
    clusters: ThematicCluster[];
    filteredCount: number;
    totalCount: number;
}

export const SuggestionFilters = (props: SuggestionFiltersProps) => {
    const { filters, onFiltersChange, clusters, filteredCount, totalCount } = props;

    const handleFilterChange = (key: keyof Filters, value: string | number) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                <FunnelIcon className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-700">Filtra Suggerimenti</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Score Filter */}
                <div>
                    <label htmlFor="score-filter" className="block text-sm font-medium text-slate-600 mb-1">Punteggio Minimo</label>
                    <select
                        id="score-filter"
                        value={filters.minScore}
                        onChange={(e) => handleFilterChange('minScore', Number(e.target.value))}
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value={0}>Tutti</option>
                        <option value={0.7}>Alta Priorità (&gt; 0.7)</option>
                        <option value={0.8}>Molto Alta (&gt; 0.8)</option>
                        <option value={0.9}>Massima Priorità (&gt; 0.9)</option>
                    </select>
                </div>
                {/* Cluster Filter */}
                <div>
                    <label htmlFor="cluster-filter" className="block text-sm font-medium text-slate-600 mb-1">Cluster Tematico</label>
                    <select
                        id="cluster-filter"
                        value={filters.cluster}
                        onChange={(e) => handleFilterChange('cluster', e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tutti i Cluster</option>
                        {clusters.map(c => <option key={c.cluster_name} value={c.cluster_name}>{c.cluster_name}</option>)}
                    </select>
                </div>
                {/* Risk Filter */}
                <div>
                    <label htmlFor="risk-filter" className="block text-sm font-medium text-slate-600 mb-1">Rischio Cannibalizzazione</label>
                    <select
                        id="risk-filter"
                        value={filters.risk}
                        onChange={(e) => handleFilterChange('risk', e.target.value)}
                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tutti</option>
                        <option value="with">Solo con rischio</option>
                        <option value="without">Senza rischio</option>
                    </select>
                </div>
                {/* Results Count */}
                <div className="flex items-end justify-center md:justify-end text-sm text-slate-500 pb-1">
                    <p>Mostrando <span className="font-bold text-slate-700">{filteredCount}</span> di <span className="font-bold text-slate-700">{totalCount}</span> suggerimenti</p>
                </div>
            </div>
        </div>
    );
};
