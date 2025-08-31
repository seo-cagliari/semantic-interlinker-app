
import React from 'react';
import { CloseIcon } from './Icons';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonString: string;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, jsonString }) => {
  if (!isOpen) return null;

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
          <h2 className="text-lg font-semibold">Suggestion JSON Data</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-auto">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-md text-sm font-mono whitespace-pre-wrap">
            <code>{jsonString}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
