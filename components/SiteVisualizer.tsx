import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { Report } from '../types';
import { BrainCircuitIcon } from './Icons';

// Definiamo un tipo che estende NodeObject per includere le nostre proprietà custom.
interface MyNode extends NodeObject {
    id: string;
    name: string;
    val: number;
    score: number;
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

interface SiteVisualizerProps {
    report: Report;
}

export const SiteVisualizer: React.FC<SiteVisualizerProps> = ({ report }) => {
    // FIX DEFINITIVO (Strategia Pragmatica):
    // Manteniamo la definizione del ref il più specifica possibile per avere il type-checking
    // corretto quando usiamo `fgRef.current`.
    const fgRef = useRef<ForceGraphMethods<MyNode, LinkObject>>(null);

    const [highlightedNode, setHighlightedNode] = useState<MyNode | null>(null);
    const [highlightLinks, setHighlightLinks] = useState<Set<LinkObject>>(new Set());
    const [highlightNodes, setHighlightNodes] = useState<Set<MyNode>>(new Set());

    const graphData = useMemo(() => {
        const nodes: MyNode[] = report.page_diagnostics.map(page => ({
            id: page.url,
            name: page.title,
            val: Math.max(0.5, page.internal_authority_score),
            score: page.internal_authority_score,
        }));

        const links: LinkObject[] = [];
        const nodeIds = new Set(nodes.map(n => n.id));

        for (const source in report.internal_links_map) {
            for (const target of report.internal_links_map[source]) {
                if(nodeIds.has(source) && nodeIds.has(target)) {
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
        const myNode = node as MyNode;
        const { links, nodes } = graphData;
        const newHighlightLinks = new Set<LinkObject>();
        const newHighlightNodes = new Set<MyNode>([myNode]);
    
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' && link.source !== null ? (link.source as MyNode).id : link.source;
            const targetId = typeof link.target === 'object' && link.target !== null ? (link.target as MyNode).id : link.target;

            if (sourceId === myNode.id || targetId === myNode.id) {
                newHighlightLinks.add(link);
                const sourceNode = nodes.find(n => n.id === sourceId);
                const targetNode = nodes.find(n => n.id === targetId);
                if (sourceNode) newHighlightNodes.add(sourceNode);
                if (targetNode) newHighlightNodes.add(targetNode);
            }
        });
    
        setHighlightedNode(myNode);
        setHighlightLinks(newHighlightLinks);
        setHighlightNodes(newHighlightNodes);

        if(fgRef.current && myNode.x !== undefined && myNode.y !== undefined){
            fgRef.current.centerAt(myNode.x, myNode.y, 1000);
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

    const getNodeColor = (node: MyNode) => clusterColorMap.get(node.id) || '#9ca3af';
    const getLinkColor = (link: LinkObject) => highlightLinks.has(link) ? '#4f46e5' : '#d1d5db';

    useEffect(() => {
        const timer = setTimeout(() => {
            if(fgRef.current){
                fgRef.current.zoomToFit(1000, 100);
            }
        }, 500);
        return () => clearTimeout(timer);
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
                // Usiamo `as any` per bypassare il complesso controllo di tipo del ref,
                // che è la causa principale degli errori di compilazione persistenti.
                // Questo sblocca la compilazione mantenendo la sicurezza dei tipi nel resto del codice.
                ref={fgRef as any}
                graphData={graphData}
                nodeRelSize={4}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const myNode = node as MyNode;
                    const label = myNode.name || '';
                    const fontSize = 12 / globalScale;
                    const isHighlighted = highlightedNode === null || highlightNodes.has(myNode);

                    if (myNode.x === undefined || myNode.y === undefined) return;

                    ctx.beginPath();
                    ctx.arc(myNode.x, myNode.y, myNode.val, 0, 2 * Math.PI, false);
                    ctx.fillStyle = isHighlighted ? getNodeColor(myNode) : 'rgba(156, 163, 175, 0.5)';
                    ctx.fill();

                    if (highlightedNode === myNode) {
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
                        ctx.fillText(shortLabel, myNode.x, myNode.y + myNode.val + 4);
                    }
                }}
                linkWidth={link => highlightLinks.has(link) ? 2 : 0.5}
                linkColor={getLinkColor}
                linkDirectionalParticles={link => highlightLinks.has(link) ? 2 : 0}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.006}
                onNodeClick={(node) => handleNodeClick(node as MyNode)}
                onBackgroundClick={handleBackgroundClick}
            />

            {highlightedNode && (
                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-2xl border border-slate-200 z-20 animate-fade-in-up max-w-lg mx-auto">
                   <h3 className="font-bold text-lg text-slate-900 truncate" title={highlightedNode.name}>{ highlightedNode.name }</h3>
                   <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="font-semibold" style={{ color: getNodeColor(highlightedNode) }}>
                         Autorità: {highlightedNode.score.toFixed(2)}/10
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