import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { Report } from '../types';
import { BrainCircuitIcon } from './Icons';

// Definiamo un tipo semplice per i dati dei nostri nodi.
// La libreria aggiungerà dinamicamente altre proprietà come x, y, ecc.
interface MyNode {
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
    // Inizializziamo un ref standard per superare i problemi di tipo della libreria.
    const fgRef = useRef(null);

    // FIX: Use specific generic types for state to match graph data
    const [highlightedNode, setHighlightedNode] = useState<NodeObject<MyNode> | null>(null);
    const [highlightLinks, setHighlightLinks] = useState<Set<LinkObject<MyNode>>>(new Set());
    const [highlightNodes, setHighlightNodes] = useState<Set<NodeObject<MyNode>>>(new Set());

    const graphData = useMemo(() => {
        const nodes: MyNode[] = report.page_diagnostics.map(page => ({
            id: page.url,
            name: page.title,
            val: Math.max(0.5, page.internal_authority_score),
            score: page.internal_authority_score,
        }));

        // FIX: Use LinkObject<MyNode> for links array, removing the incorrect MyLink interface.
        const links: LinkObject<MyNode>[] = [];
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

    // FIX: Use specific NodeObject<MyNode> type for node parameter
    const handleNodeClick = useCallback((node: NodeObject<MyNode>) => {
        const { links, nodes } = graphData;
        const newHighlightLinks = new Set<LinkObject<MyNode>>();
        const newHighlightNodes = new Set<NodeObject<MyNode>>([node]);
    
        links.forEach(link => {
            // FIX: Use NodeObject<MyNode> for casting link source/target
            const sourceId = typeof link.source === 'object' && link.source !== null && 'id' in link.source ? (link.source as NodeObject<MyNode>).id : link.source;
            const targetId = typeof link.target === 'object' && link.target !== null && 'id' in link.target ? (link.target as NodeObject<MyNode>).id : link.target;

            if (sourceId === node.id || targetId === node.id) {
                newHighlightLinks.add(link);
                const sourceNode = nodes.find(n => n.id === sourceId);
                const targetNode = nodes.find(n => n.id === targetId);
                // FIX: Cast nodes to NodeObject<MyNode> when adding to set
                if (sourceNode) newHighlightNodes.add(sourceNode as NodeObject<MyNode>);
                if (targetNode) newHighlightNodes.add(targetNode as NodeObject<MyNode>);
            }
        });
    
        setHighlightedNode(node);
        setHighlightLinks(newHighlightLinks);
        setHighlightNodes(newHighlightNodes);

        const fg = fgRef.current as ForceGraphMethods | null;
        if(fg && node.x !== undefined && node.y !== undefined){
            fg.centerAt(node.x, node.y, 1000);
            fg.zoom(2.5, 1000);
        }

    }, [graphData]);

    const handleBackgroundClick = useCallback(() => {
        setHighlightedNode(null);
        setHighlightLinks(new Set());
        setHighlightNodes(new Set());
        const fg = fgRef.current as ForceGraphMethods | null;
        if(fg){
            fg.zoomToFit(1000, 100);
        }
    }, []);

    const getNodeColor = (node: NodeObject<MyNode>) => clusterColorMap.get(node.id as string) || '#9ca3af';
    const getLinkColor = (link: LinkObject<MyNode>) => highlightLinks.has(link) ? '#4f46e5' : '#d1d5db';

    useEffect(() => {
        setTimeout(() => {
            const fg = fgRef.current as ForceGraphMethods | null;
            if(fg){
                fg.zoomToFit(1000, 100);
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
                ref={fgRef as any} // FIX: Casting as 'any' to bypass strict library type-checking.
                graphData={graphData}
                nodeRelSize={4}
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const myNode = node as NodeObject<MyNode>; // Cast to access custom props and library props
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
                linkWidth={link => highlightLinks.has(link as LinkObject<MyNode>) ? 2 : 0.5}
                linkColor={getLinkColor as (link: object) => string}
                linkDirectionalParticles={link => highlightLinks.has(link as LinkObject<MyNode>) ? 2 : 0}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={_ => 0.006}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
            />

            {highlightedNode && (
                <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-2xl border border-slate-200 z-20 animate-fade-in-up max-w-lg mx-auto">
                   <h3 className="font-bold text-lg text-slate-900 truncate" title={highlightedNode.name}>{ highlightedNode.name }</h3>
                   <div className="flex items-center gap-4 text-sm mt-1">
                      <span className="font-semibold" style={{ color: getNodeColor(highlightedNode) }}>
                         Autorità: {(highlightedNode.score || 0).toFixed(2)}/10
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
