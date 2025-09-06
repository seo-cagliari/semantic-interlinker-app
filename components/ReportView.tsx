
import React, { useMemo } from 'react';
import { Report, Suggestion } from '../types';
import { LinkIcon } from './Icons';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionFilters, Filters } from './SuggestionFilters';

interface ReportViewProps {
  report: Report;
  selectedSuggestions: Set<string>;
  onViewJson: (suggestion: Suggestion) => void;
  onViewModification: (suggestion: Suggestion) => void;
  onToggleSelection: (suggestionId: string) => void;
  filters: Filters;
  onFiltersChange: (newFilters: Filters) => void;
}

export const ReportView = (props: ReportViewProps) => {
  const {
    report,
    selectedSuggestions,
    onViewJson,
    onViewModification,
    onToggleSelection,
    filters,
    onFiltersChange,
  } = props;

  const filteredSuggestions = useMemo(() => {
    const { minScore, cluster, risk } = filters;
    if (!report.suggestions) return [];

    return report.suggestions.filter(suggestion => {
        // Score filter
        if (suggestion.score < minScore) return false;

        // Risk filter
        if (risk === 'with' && !suggestion.risk_checks.potential_cannibalization) return false;
        if (risk === 'without' && suggestion.risk_checks.potential_cannibalization) return false;

        // Cluster filter
        if (cluster !== 'all') {
            const sourceCluster = report.thematic_clusters.find(c => c.pages.includes(suggestion.source_url));
            if (!sourceCluster || sourceCluster.cluster_name !== cluster) return false;
        }

        return true;
    });
  }, [report.suggestions, report.thematic_clusters, filters]);

  return (
    <>
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="w-8 h-8 text-slate-500" />
            <h2 className="text-2xl font-bold text-slate-800">Suggerimenti di Collegamento</h2>
        </div>
        <SuggestionFilters 
          filters={filters}
          onFiltersChange={onFiltersChange}
          clusters={report.thematic_clusters || []}
          filteredCount={filteredSuggestions.length}
          totalCount={(report.suggestions || []).length}
        />
        <div className="space-y-6">
            {filteredSuggestions.map((suggestion, index) => (
            <div key={suggestion.suggestion_id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                <SuggestionCard
                suggestion={suggestion}
                isSelected={selectedSuggestions.has(suggestion.suggestion_id)}
                onViewJson={onViewJson}
                onViewModification={onViewModification}
                onToggleSelection={onToggleSelection}
                />
            </div>
            ))}
            {filteredSuggestions.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p>Nessun suggerimento corrisponde ai filtri selezionati.</p>
              </div>
            )}
        </div>
      </div>
    </>
  );
};
