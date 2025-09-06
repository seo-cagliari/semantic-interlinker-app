
import React from 'react';
import { ProgressReport, ProgressMetric } from '../types';
import { CloseIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, BrainCircuitIcon } from './Icons';

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ProgressReport | null;
}

interface MetricChangeProps {
    value: number;
    unit: string;
    positiveIsGood: boolean;
}

const MetricChange = (props: MetricChangeProps) => {
    const { value, unit, positiveIsGood } = props;
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isNeutral = Math.abs(value) < 0.01;

    let colorClass = 'text-slate-600';
    if (!isNeutral) {
        if ((isPositive && positiveIsGood) || (isNegative && !positiveIsGood)) {
            colorClass = 'text-green-600';
        } else {
            colorClass = 'text-red-600';
        }
    }

    const sign = isPositive ? '+' : '';

    return (
        <span className={`font-bold ${colorClass}`}>
            {sign}{value.toFixed(2)}{unit}
        </span>
    );
};


export const ProgressReportModal = (props: ProgressReportModalProps) => {
  const { isOpen, onClose, report } = props;
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Report Analisi Progressi</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        {!report ? (
             <div className="p-6 text-center">
                <p>Caricamento del report...</p>
            </div>
        ) : (
             <div className="p-6 overflow-auto space-y-6">
                <div className="text-sm text-slate-500">
                    Confronto tra il {new Date(report.previous_report_date).toLocaleDateString('it-IT')} e oggi ({new Date(report.current_report_date).toLocaleDateString('it-IT')})
                    per il sito: <strong className="text-slate-700">{report.site}</strong>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <BrainCircuitIcon className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-1">Riepilogo Strategico dell'AI</h3>
                            <p className="text-sm text-slate-700">{report.ai_summary}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Vittorie Principali (Key Wins)</h3>
                    <div className="space-y-3">
                        {report.key_wins.length > 0 ? report.key_wins.map((metric, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="md:col-span-2">
                                    <p className="font-semibold text-blue-700 break-all" title={metric.query}>"{metric.query}"</p>
                                    <a href={metric.page} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:underline break-all" title={metric.page}>
                                        {metric.page}
                                    </a>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-center">
                                    <div>
                                        <p className="text-xs text-slate-500">CTR</p>
                                        <div className="flex items-center justify-center gap-1">
                                             <ArrowTrendingUpIcon className="w-4 h-4 text-slate-400"/>
                                             <MetricChange value={metric.ctr_change * 100} unit="%" positiveIsGood={true} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Posizione</p>
                                        <div className="flex items-center justify-center gap-1">
                                             <ArrowTrendingDownIcon className="w-4 h-4 text-slate-400"/>
                                             <MetricChange value={metric.position_change} unit="" positiveIsGood={false} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 italic">Nessun miglioramento significativo rilevato in base ai criteri attuali.</p>
                        )}
                    </div>
                </div>
             </div>
        )}
        
      </div>
    </div>
  );
};
