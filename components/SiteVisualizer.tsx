import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { Report } from '../types';
import { BrainCircuitIcon, FolderIcon } from './Icons';

interface SiteVisualizerProps {
  report: Report;
}

const colorPalette = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f97316', // orange-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f59e0b', // amber-500
];

export const SiteVisualizer: React.FC<SiteVisualizerProps> = ({ report }) => {
    // FIX: Initialize useRef with null to fix the "Expected 1 arguments, but got 0" error.
    const fgRef = useRef<ForceGraphMethods>(null);
    const [highlightedNode, setHighlightedNode] = useState<NodeObject | null>(null);
    const [highlightLinks, setHighlightLinks] = useState<Set<LinkObject>>(new Set());
    const [highlightNodes, setHighlightNodes] = useState<Set<NodeObject>>(new Set());

    const graphData = useMemo(() => {
        const nodes: NodeObject[] = report.page_diagnostics.map(page => ({
            id: page.url,
            name: page.title,
            val: Math.max(0.5, page.internal_authority_score),
            score: page.internal_authority_score,
        }));

        const links: LinkObject[] = [];
        for (const source in report.internal_links_map) {
            for (const target of report.internal_links_map[source]) {
                if(nodes.some(n => n.id === source) && nodes.some(n => n.id === target)) {
                    links.push({ source, target });
                }
            }
        }
        
        return { nodes, links };
    }, [report]);
    
    const clusterColorMap = useMemo(() => {
        const map = new Map<string, string>();
        report.thematic_clusters.forEach((cluster, i) => {
            cluster.pages.forEach(pageUrl => {
                map.set(pageUrl, colorPalette[i % colorPalette.length]);
            });
        });
        return map;
    }, [report.thematic_clusters]);

    const handleNodeClick = useCallback((node: NodeObject) => {
        const { links } = graphData;
        const newHighlightLinks = new Set<LinkObject>();
        const newHighlightNodes = new Set<NodeObject>([node]);
    
        links.forEach(link => {
            if (link.source === node.id || link.target === node.id) {
                newHighlightLinks.add(link);
                if (link.source) newHighlightNodes.add(link.source as NodeObject);
                if (link.target) newHighlightNodes.add(link.target as NodeObject);
            }
        });
    
        setHighlightedNode(node);
        setHighlightLinks(newHighlightLinks);
        setHighlightNodes(newHighlightNodes);

        if(fgRef.current){
            fgRef.current.centerAt(node.x!, node.y!, 1000);
            fgRef.current.zoom(2.5, 1000);
        }

    }, [graphData]);

    const handleBackgroundClick = useCallback(() => {
        setHighlightedNode(null);
        setHighlightLinks(new Set());
        setHighlightNodes(new Set());
        if(fgRef.current){
            fgRef.current.zoomToFit(1000, 100);
        }
    }, []);

    const getNodeColor = (node: NodeObject) => clusterColorMap.get(node.id as string) || '#9ca3af';

    const getLinkColor = (link: LinkObject) => highlightLinks.has(link) ? '#4f46e5' : '#d1d5db';

    // Auto-zoom on first load
    useEffect(() => {
        setTimeout(() => {
            if(fgRef.current){
                fgRef.current.zoomToFit(1000, 100);
            }
        }, 500);
    }, []);

    return (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-lg relative h-[70vh] animate-fade-in-up">
            <div className="absolute top-0 left-0 p-4 z-10 w-full bg-gradient-to-b from-white to-transparent pointer-events-none">
                <div className="flex items-center gap-3 mb-4">
                    <BrainCircuitIcon className="w-8 h-8 text-slate-500" />
                    <h2 className="text-2xl font-bold text-slate-800">Visualizzatore Architettura Sito</h2>
                </div>
                 <div className="flex flex-wrap gap-2">
                    {report.thematic_clusters.map((cluster, i) => (
                        <div key={cluster.cluster_name} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-slate-100">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorPalette[i % colorPalette.length] }}></div>
                            <span className="font-semibold">{cluster.cluster_name}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeRelSize={4}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name || '';
                    const fontSize = 12 / globalScale;
                    const isHighlighted = highlightedNode === null || highlightNodes.has(node);

                    ctx.beginPath();
                    ctx.arc(node.x!, node.y!, node.val as number, 0, 2 * Math.PI, false);
                    ctx.fillStyle = isHighlighted ? getNodeColor(node) : 'rgba(156, 163, 175, 0.5)';
                    ctx.fill();

                    if (highlightedNode === node) {
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2 / globalScale;
                        ctx.stroke();
                    }
                    
                    if (globalScale > 1.5) {
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = isHighlighted ? '#1e293b' : 'rgba(100, 115, 135, 0.8)';
                        const shortLabel = label.length > 25 ? `${label.substring(0, 25)}...` : label;
                        ctx.fillText(shortLabel, node.x!, node.y! + (node.val as number) + 4);
                    }
                }}
                linkWidth={link => highlightLinks.has(link) ? 2 : 0.5}
                linkColor={getLinkColor}
                linkDirectionalParticles={link => highlightLinks.has(link) ? 2 : 0}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={() => 0.006}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
            />

            {highlightedNode && (
                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-2xl border border-slate-200 z-20 animate-fade-in-up max-w-lg mx-auto">
                   <h3 className="font-bold text-lg text-slate-900 truncate" title={highlightedNode.name as string}>{highlightedNode.name}</h3>
                   <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="font-semibold" style={{ color: getNodeColor(highlightedNode) }}>
                         Autorità: {(highlightedNode.score as number).toFixed(2)}/10
                      </span>
                      <a href={highlightedNode.id as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Apri Pagina
                      </a>
                   </div>
                </div>
            )}
        </div>
    );
};