import React from 'react';
import { ThematicCluster } from '../types';
import { FolderIcon } from './Icons';

export const ThematicClusters: React.FC<{ clusters: ThematicCluster[] }> = ({ clusters }) => (
  <div className="my-16">
    <div className="flex items-center gap-3 mb-4">
      <FolderIcon className="w-8 h-8 text-slate-500" />
      <h2 className="text-2xl font-bold text-slate-800">Mappa Tematica del Sito</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(clusters || []).map((cluster, index) => (
        <div key={index} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
          <h3 className="font-bold text-slate-900 mb-2">{cluster.cluster_name}</h3>
          <p className="text-sm text-slate-600 mb-4">{cluster.cluster_description}</p>
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Pagine nel cluster</h4>
            <ul className="space-y-1">
              {(cluster.pages || []).slice(0, 5).map((page, pageIndex) => (
                <li key={pageIndex} className="text-sm text-blue-600 truncate">
                  <a href={page} target="_blank" rel="noopener noreferrer" className="hover:underline" title={page}>
                    {page.split('/').filter(Boolean).pop() || page}
                  </a>
                </li>
              ))}
              {cluster.pages && cluster.pages.length > 5 && <li className="text-xs text-slate-400 mt-1">...e altre {cluster.pages.length - 5}</li>}
            </ul>
          </div>
        </div>
      ))}
    </div>
  </div>
);