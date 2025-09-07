
import React from 'react';
import { ContentBrief } from '../types';
import { CloseIcon, ListBulletIcon, BrainCircuitIcon, QuestionMarkCircleIcon, LinkIcon } from './Icons';

interface ContentBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: ContentBrief | null;
}

interface SectionProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

const Section = (props: SectionProps) => {
    const { icon, title, children } = props;
    return (
        <div>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="pl-8 space-y-2 text-slate-700">
                {children}
            </div>
        </div>
    );
};

export const ContentBriefModal = (props: ContentBriefModalProps) => {
  const { isOpen, onClose, brief } = props;
  
  if (!isOpen || !brief) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Brief del Contenuto Strategico</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-auto">
          {/* Struttura */}
          <Section icon={<ListBulletIcon className="w-5 h-5 text-slate-500" />} title="Struttura del Contenuto">
            <ul className="list-none space-y-1">
                {(brief.structure_suggestions || []).map((item, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${item.type === 'h2' ? 'font-semibold text-slate-900 mt-2' : 'ml-4'}`}>
                        <span className="text-slate-400">{item.type === 'h2' ? 'H2:' : 'H3:'}</span>
                        <span>{item.title}</span>
                    </li>
                ))}
            </ul>
          </Section>
          
          {/* Entità Semantiche */}
          <Section icon={<BrainCircuitIcon className="w-5 h-5 text-slate-500" />} title="Entità Semantiche da Includere">
             <div className="flex flex-wrap gap-2">
                {(brief.semantic_entities || []).map((entity, index) => (
                    <span key={index} className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">{entity}</span>
                ))}
             </div>
          </Section>

          {/* Domande Chiave */}
          <Section icon={<QuestionMarkCircleIcon className="w-5 h-5 text-slate-500" />} title="Domande Chiave a cui Rispondere">
             <ul className="list-disc list-inside space-y-1.5 text-sm">
                {(brief.key_questions_to_answer || []).map((question, index) => (
                    <li key={index}>{question}</li>
                ))}
             </ul>
          </Section>

          {/* Link Interni */}
          <Section icon={<LinkIcon className="w-5 h-5 text-slate-500" />} title="Suggerimenti di Link Interni">
             <div className="space-y-3">
                 {(brief.internal_link_suggestions || []).map((link, index) => (
                     <div key={index} className="text-sm p-3 bg-slate-50 rounded-md border border-slate-200">
                        <p>
                            <span className="font-semibold">A:</span> <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{link.target_url}</a>
                        </p>
                        <p>
                            <span className="font-semibold">Anchor Text:</span> <span className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md font-medium">{link.anchor_text}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 italic">
                           "{link.rationale}"
                        </p>
                     </div>
                 ))}
             </div>
          </Section>
        </div>
      </div>
    </div>
  );
};