import React, { useState } from 'react';
import { Report, DeepAnalysisReport, PageDiagnostic, SavedReport, Suggestion } from '../types';
import ReportView from './ReportView';
import VisualizerView from './VisualizerView';
import { DocumentTextIcon, RectangleGroupIcon, ArrowPathIcon, ClockIcon, LoadingSpinnerIcon } from './Icons';

type ViewMode = 'report' | 'visualizer';

interface ReportDisplayProps {
  report: Report;
  sortedPages: PageDiagnostic[];
  savedReport: SavedReport | null;
  isProgressLoading: boolean;
  onProgressCheck: () => void;
  onNewAnalysis: () => void;
  onAnalyzeFromHub: (url: string) => void;
  selectedSuggestions: Set<string>;
  onViewJson: (suggestion: Suggestion) => void;
  onViewModification: (suggestion: Suggestion) => void;
  onToggleSelection: (suggestionId: string) => void;
  selectedDeepAnalysisUrl: string;
  onSetSelectedDeepAnalysisUrl: (url: string) => void;
  onDeepAnalysis: () => void;
  isDeepLoading: boolean;
  deepError: string | null;
  deepAnalysisReport: DeepAnalysisReport | null;
}

const ReportDisplay: React.FC<ReportDisplayProps> = (props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  
  return (
    <div className="animate-fade-in-up">
      <div className="mb-10">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <h2 className="text-3xl font-bold text-slate-800">Report Strategico</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(prev => prev === 'report' ? 'visualizer' : 'report')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {viewMode === 'report' ? (
                <>
                  <RectangleGroupIcon className="w-5 h-5"/>
                  Visualizza Architettura
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-5 h-5"/>
                  Visualizza Report
                </>
              )}
            </button>
            <button
                onClick={props.onNewAnalysis}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <ArrowPathIcon className="w-5 h-5" />
                Nuova Analisi
            </button>
            {props.savedReport && (
                <button
                    onClick={props.onProgressCheck}
                    disabled={props.isProgressLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                    {props.isProgressLoading ? <LoadingSpinnerIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                    Controlla Progresso
                </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Pagine Scansite</p>
            <p className="text-2xl font-bold text-slate-800">{props.report.summary.pages_scanned}</p>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Pagine Indicizzabili</p>
            <p className="text-2xl font-bold text-slate-800">{props.report.summary.indexable_pages}</p>
          </div>
          <div className="bg-slate-100 p-4 rounded-lg">
            <p className="text-sm text-slate-500">Suggerimenti</p>
            <p className="text-2xl font-bold text-slate-800">{props.report.summary.suggestions_total}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <p className="text-sm text-green-600">Priorità Alta</p>
            <p className="text-2xl font-bold text-green-800">{props.report.summary.high_priority}</p>
          </div>
        </div>
      </div>

      {viewMode === 'report' ? <ReportView {...props} /> : <VisualizerView report={props.report} />}
    </div>
  );
};

export default ReportDisplay;