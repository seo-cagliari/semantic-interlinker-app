import React from 'react';
import { Suggestion } from '../types';
import { CheckCircleIcon, CodeBracketIcon, PencilSquareIcon, ExclamationTriangleIcon, LinkIcon, MapPinIcon, TagIcon } from './Icons';

interface SuggestionCardProps {
  suggestion: Suggestion;
  isSelected: boolean;
  onViewJson: (suggestion: Suggestion) => void;
  onViewModification: (suggestion: Suggestion) => void;
  onToggleSelection: (suggestionId: string) => void;
}

interface CannibalizationTooltipProps {
    details: NonNullable<Suggestion['risk_checks']['cannibalization_details']>;
}

const CannibalizationTooltip = (props: CannibalizationTooltipProps) => {
    const { details } = props;
    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 md:w-80 p-3 rounded-lg shadow-xl bg-slate-800 text-white text-xs z-20 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none">
            <div className="font-bold mb-2 border-b border-slate-600 pb-1">Diagnosi Cannibalizzazione</div>
            
            <div className="mb-2">
                <h4 className="font-semibold text-slate-300">Query Contese:</h4>
                <ul className="list-disc list-inside space-y-0.5">
                    {(details.competing_queries || []).map((q, i) => <li key={i}><span className="text-amber-300">"{q}"</span></li>)}
                </ul>
            </div>

            <div>
                <h4 className="font-semibold text-slate-300">Consigli dell'AI:</h4>
                <ul className="list-disc list-inside space-y-0.5">
                    {(details.remediation_steps || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-slate-800 rotate-45"></div>
        </div>
    );
};

interface RiskCheckItemProps {
    label: string;
    value: boolean;
    isWarning?: boolean;
    children?: React.ReactNode;
}

const RiskCheckItem = (props: RiskCheckItemProps) => {
    const { label, value, isWarning = false, children } = props;
    const Icon = value ? (isWarning ? ExclamationTriangleIcon : CheckCircleIcon) : CheckCircleIcon;
    const colorClass = value ? (isWarning ? 'text-yellow-600' : 'text-green-600') : 'text-green-600';
    const text = value ? (isWarning ? 'Rilevato' : 'Sì') : 'No';

    return (
        <div className="relative flex items-center gap-1 group">
            <Icon className={`w-4 h-4 ${value ? (isWarning ? 'text-yellow-500' : 'text-green-500') : 'text-green-500'}`} />
            <span>{label}:</span>
            <span className={`font-medium ${colorClass}`}>{text}</span>
            {children}
        </div>
    );
};


export const SuggestionCard = (props: SuggestionCardProps) => {
  const { suggestion, isSelected, onViewJson, onViewModification, onToggleSelection } = props;
  const { 
    source_url, 
    target_url, 
    score, 
    proposed_anchor, 
    anchor_variants,
    insertion_hint,
    semantic_rationale,
    risk_checks,
    suggestion_id
  } = suggestion;

  const scoreColorClass = score >= 0.75 ? 'bg-green-100 text-green-800' : score >= 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800';
  const scoreBorderClass = score >= 0.75 ? 'border-green-200' : score >= 0.6 ? 'border-yellow-200' : 'border-slate-200';
  const selectionClass = isSelected ? 'border-blue-500 ring-2 ring-blue-200' : scoreBorderClass;


  return (
    <div className={`relative rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-lg ${selectionClass}`}>
      <div className="absolute top-4 right-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(suggestion_id)}
          aria-label={`Select suggestion for ${target_url}`}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-4 pr-8">
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-slate-800 flex items-start gap-2">
            <LinkIcon className="w-5 h-5 mt-1 text-slate-400 shrink-0" />
            <span className="break-all">
                <span className="font-normal text-slate-500">DA:</span> {source_url}
                <br />
                <span className="font-normal text-slate-500">A:</span> {target_url}
            </span>
          </h3>
        </div>
        <div className={`text-sm font-bold px-3 py-1 rounded-full ${scoreColorClass}`}>Punteggio: {score.toFixed(2)}</div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mb-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <TagIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <div><b className="font-semibold">Anchor Text:</b> <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{proposed_anchor}</span></div>
          </div>
          <div className="flex items-start gap-2">
            <TagIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0 opacity-60" />
            <div><b className="font-semibold">Varianti:</b> {(anchor_variants || []).join(" · ")}</div>
          </div>
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <div><b className="font-semibold">Posizione:</b> {insertion_hint.position_hint} ({insertion_hint.block_type})</div>
          </div>
        </div>
        <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
          <div><b className="font-semibold">Motivo Semantico:</b> {semantic_rationale.topic_match}</div>
          {semantic_rationale.intent_alignment_comment && (
            <div><b className="font-semibold">Analisi Intent:</b> <span className="text-slate-600">{semantic_rationale.intent_alignment_comment}</span></div>
          )}
          <div><b className="font-semibold">Entità Comuni:</b> <span className="text-slate-600">{(semantic_rationale.entities_in_common || []).join(", ")}</span></div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <b>Controlli di rischio:</b>
          <RiskCheckItem label="Stato" value={risk_checks.target_status === 200} />
          <RiskCheckItem label="Indicizzabile" value={risk_checks.target_indexable} />
          <RiskCheckItem label="Canonical OK" value={risk_checks.canonical_ok} />
          <RiskCheckItem 
            label="Cannibalizzazione" 
            value={!!risk_checks.potential_cannibalization} 
            isWarning={true}
          >
            {risk_checks.potential_cannibalization && risk_checks.cannibalization_details && (
                <CannibalizationTooltip details={risk_checks.cannibalization_details} />
            )}
          </RiskCheckItem>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => onViewModification(suggestion)} className="w-full md:w-auto flex-grow text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-700 transition-colors">
            <PencilSquareIcon className="w-4 h-4" />
            Vedi modifica
          </button>
          <button onClick={() => onViewJson(suggestion)} className="text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors">
             <CodeBracketIcon className="w-4 h-4" />
             Vedi JSON
          </button>
        </div>
      </div>
    </div>
  );
};