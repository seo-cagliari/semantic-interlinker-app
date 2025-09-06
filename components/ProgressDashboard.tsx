
import React from 'react';
import { ProgressReport, ProgressMetric } from '../types';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BrainCircuitIcon, ArrowPathIcon } from './Icons';

interface ProgressDashboardProps {
  report: ProgressReport;
  onBack: () => void;
}

interface MetricChangeProps {
    value: number;
    unit: string;
    positiveIsGood: boolean;
}

const MetricChange = (props: MetricChangeProps) => {
    const { value, unit, positiveIsGood } = props;
    const isPositive = value > 0.001;
    const isNegative = value < -0.001;
    
    let colorClass = 'text-slate-600';
    if (isPositive && positiveIsGood) colorClass = 'text-green-600';
    if (isNegative && !positiveIsGood) colorClass = 'text-green-600';
    if (isPositive && !positiveIsGood) colorClass = 'text-red-600';
    if (isNegative && positiveIsGood) colorClass = 'text-red-600';

    const sign = isPositive ? '+' : '';
    const formattedValue = unit === '%' ? (value).toFixed(2) : value.toFixed(1);

    return (
        <span className={`font-bold ${colorClass}`}>
            {sign}{formattedValue}{unit}
        </span>
    );
};

export const ProgressDashboard = (props: ProgressDashboardProps) => {
  const { report, onBack } = props;
  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Report Analisi Progressi</h2>
        <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
        >
            <ArrowPathIcon className="w-5 h-5" />
            Torna al Report Principale
        </button>
      </div>
      
      <div className="space-y-8">
        <div className="text-sm text-slate-500 bg-slate-100 p-4 rounded-lg">
            Confronto tra il {new Date(report.previous_report_date).toLocaleDateString('it-IT')} e oggi ({new Date(report.current_report_date).toLocaleDateString('it-IT')})
            per il sito: <strong className="text-slate-700">{report.site}</strong>
        </div>

        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-4">
                <BrainCircuitIcon className="w-8 h-8 text-blue-500 shrink-0 mt-1" />
                <div>
                    <h3 className="font-semibold text-slate-900 text-xl mb-1">Riepilogo Strategico dell'AI</h3>
                    <p className="text-sm text-slate-700">{report.ai_summary}</p>
                </div>
            </div>
        </div>

        <div>
            <h3 className="text-2xl font-semibold text-slate-800 mb-4">Vittorie Principali (Key Wins)</h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Query & Pagina</th>
                                <th scope="col" className="px-6 py-3 text-center">CTR Variazione</th>
                                <th scope="col" className="px-6 py-3 text-center">Posizione Variazione</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.key_wins.length > 0 ? report.key_wins.map((metric, index) => (
                                <tr key={index} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-blue-700 break-all" title={metric.query}>"{metric.query}"</p>
                                        <a href={metric.page} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:underline break-all" title={metric.page}>
                                            {metric.page}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-base">
                                            <ArrowTrendingUpIcon className="w-4 h-4 text-slate-400"/>
                                            <MetricChange value={metric.ctr_change * 100} unit="%" positiveIsGood={true} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                         <div className="flex items-center justify-center gap-1.5 text-base">
                                            <ArrowTrendingDownIcon className="w-4 h-4 text-slate-400"/>
                                            <MetricChange value={metric.position_change} unit="" positiveIsGood={false} />
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center italic">
                                        Nessun miglioramento significativo rilevato in base ai criteri attuali.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
