import React, { useState, useCallback } from 'react';
import { Suggestion } from '../types';
import { CloseIcon, ClipboardIcon, CheckCircleIcon } from './Icons';

interface ModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: Suggestion | null;
}

export const ModificationModal: React.FC<ModificationModalProps> = ({ isOpen, onClose, suggestion }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (suggestion) {
      const linkHtml = `<a href="${suggestion.target_url}">${suggestion.proposed_anchor}</a>`;
      navigator.clipboard.writeText(linkHtml).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      });
    }
  }, [suggestion]);

  if (!isOpen || !suggestion) return null;

  const linkHtml = `<a href="${suggestion.target_url}">${suggestion.proposed_anchor}</a>`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Proposta di Modifica Manuale</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-auto">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-1">1. Copia il codice HTML del link</label>
            <div className="flex items-center gap-2">
              <pre className="flex-grow bg-slate-900 text-slate-100 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">
                <code>{linkHtml}</code>
              </pre>
              <button
                onClick={handleCopy}
                className={`w-28 flex items-center justify-center gap-2 px-3 py-2 rounded-md border font-semibold transition-colors ${
                  copied
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Copiato!
                  </>
                ) : (
                  <>
                    <ClipboardIcon className="w-4 h-4" />
                    Copia
                  </>
                )}
              </button>
            </div>
          </div>
          <div>
             <label className="text-sm font-semibold text-slate-600 block mb-1">2. Inserisci il link nella pagina sorgente</label>
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700">
                <p><strong className="font-semibold">Pagina da modificare:</strong> <a href={suggestion.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{suggestion.source_url}</a></p>
                <p className="mt-2"><strong className="font-semibold">Istruzioni AI:</strong> {suggestion.insertion_hint.position_hint} ({suggestion.insertion_hint.block_type})</p>
                <p className="mt-1 text-xs text-slate-500"><strong>Motivo:</strong> {suggestion.insertion_hint.reason}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};