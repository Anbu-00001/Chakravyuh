import React, { useState, useEffect } from 'react';
import { Network, Server } from 'lucide-react';
import { SIMULATE_API_URL } from '../config';

export interface GraphNode {
  id: string;
  name: string;
  type: 'source' | 'chokepoint' | 'port' | 'refinery' | 'spr' | 'buffer' | 'demand';
  stress_pct: number;
  region?: string;
  capacity_bpd?: number;
  demand_bpd?: number;
}

interface PipelineGraphViewProps {
  severityPct: number;
}

export const PipelineGraphView: React.FC<PipelineGraphViewProps> = ({ severityPct }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  // True only once the real /api/simulate/topology fetch has resolved with live nodes.
  // Starts false because the array below is a hardcoded bootstrap topology, not simulation
  // output - the UI must say so until the real data replaces it.
  const [isLiveTopology, setIsLiveTopology] = useState<boolean>(false);

  // Hardcoded bootstrap topology shown only until the live topology fetch resolves.
  const [nodes, setNodes] = useState<GraphNode[]>([
    // Suppliers
    { id: 'src_ras_tanura', name: 'Ras Tanura (Saudi Arabia)', type: 'source', stress_pct: Math.min(100, severityPct * 1.1), capacity_bpd: 1800000, region: 'Persian Gulf' },
    { id: 'src_kharg_island', name: 'Kharg Island (Iran)', type: 'source', stress_pct: Math.min(100, severityPct * 1.2), capacity_bpd: 800000, region: 'Persian Gulf' },
    { id: 'src_mina_ahmadi', name: 'Mina Al Ahmadi (Kuwait)', type: 'source', stress_pct: Math.min(100, severityPct * 1.0), capacity_bpd: 900000, region: 'Persian Gulf' },
    { id: 'src_ras_laffan', name: 'Ras Laffan (Qatar)', type: 'source', stress_pct: Math.min(100, severityPct * 1.0), capacity_bpd: 700000, region: 'Persian Gulf' },
    { id: 'src_non_gulf', name: 'West Africa / Americas', type: 'source', stress_pct: 12.0, capacity_bpd: 1400000, region: 'Atlantic / LatAm' },

    // Chokepoints
    { id: 'chk_hormuz', name: 'Strait of Hormuz', type: 'chokepoint', stress_pct: severityPct, capacity_bpd: 4200000 },
    { id: 'chk_cape', name: 'Cape of Good Hope', type: 'chokepoint', stress_pct: Math.max(10, 100 - severityPct), capacity_bpd: 10000000 },

    // Ports
    { id: 'port_vadinar', name: 'Vadinar / Sikka Port (Gujarat)', type: 'port', stress_pct: Math.min(95, severityPct * 0.9), capacity_bpd: 1750000 },
    { id: 'port_mumbai', name: 'JNPT / Mumbai Port (Maharashtra)', type: 'port', stress_pct: Math.min(85, severityPct * 0.7), capacity_bpd: 400000 },
    { id: 'port_mangalore', name: 'New Mangalore Port (Karnataka)', type: 'port', stress_pct: Math.min(75, severityPct * 0.6), capacity_bpd: 350000 },
    { id: 'port_cochin', name: 'Cochin Port (Kerala)', type: 'port', stress_pct: Math.min(70, severityPct * 0.55), capacity_bpd: 310000 },
    { id: 'port_vizag', name: 'Visakhapatnam Port (Andhra)', type: 'port', stress_pct: 25.0, capacity_bpd: 300000 },

    // Refineries
    { id: 'ref_jamnagar', name: 'Reliance Jamnagar (1.24 Mbpd)', type: 'refinery', stress_pct: Math.min(95, severityPct * 0.85), demand_bpd: 1240000 },
    { id: 'ref_vadinar', name: 'Nayara Vadinar (0.40 Mbpd)', type: 'refinery', stress_pct: Math.min(90, severityPct * 0.8), demand_bpd: 400000 },
    { id: 'ref_mumbai', name: 'BPCL/HPCL Mumbai (0.39 Mbpd)', type: 'refinery', stress_pct: Math.min(80, severityPct * 0.7), demand_bpd: 390000 },
    { id: 'ref_mangaluru', name: 'MRPL Mangalore (0.30 Mbpd)', type: 'refinery', stress_pct: Math.min(75, severityPct * 0.6), demand_bpd: 300000 },
    { id: 'ref_kochi', name: 'BPCL Kochi (0.31 Mbpd)', type: 'refinery', stress_pct: Math.min(70, severityPct * 0.55), demand_bpd: 310000 },
    { id: 'ref_paradip', name: 'IOCL Paradip (0.30 Mbpd)', type: 'refinery', stress_pct: Math.min(60, severityPct * 0.45), demand_bpd: 300000 },
    { id: 'ref_vskp', name: 'HPCL Visakhapatnam (0.30 Mbpd)', type: 'refinery', stress_pct: Math.min(55, severityPct * 0.4), demand_bpd: 300000 },

    // SPR Reserves
    { id: 'spr_vskp', name: 'Visakhapatnam SPR (1.33 MMT)', type: 'spr', stress_pct: 35.0, capacity_bpd: 200000 },
    { id: 'spr_mglr', name: 'Mangaluru SPR (1.50 MMT)', type: 'spr', stress_pct: 45.0, capacity_bpd: 250000 },
    { id: 'spr_pdr', name: 'Padur SPR (2.50 MMT)', type: 'spr', stress_pct: 50.0, capacity_bpd: 250000 }
  ]);

  useEffect(() => {
    const fetchTopology = async () => {
      try {
        const res = await fetch(`${SIMULATE_API_URL}/api/simulate/topology?chokepoint=chk_hormuz&severity_pct=${severityPct}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.nodes && Array.isArray(data.nodes)) {
            setNodes(data.nodes);
            setIsLiveTopology(true);
            return;
          }
        }
        setIsLiveTopology(false);
      } catch (err) {
        console.warn("FastAPI topology endpoint offline:", err);
        setIsLiveTopology(false);
      }
    };
    fetchTopology();
  }, [severityPct, SIMULATE_API_URL]);

  const getBadgeColor = (stress: number) => {
    if (stress > 75) return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (stress > 45) return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
  };

  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-4 rounded font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-400 tracking-wider">CAUSAL SUPPLY CHAIN TOPOLOGY ({nodes.length} NODES)</h3>
          <span className={`px-1.5 py-0.5 border text-[9px] font-bold rounded ${
            isLiveTopology
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          }`}>
            {isLiveTopology ? 'LIVE TOPOLOGY' : 'BOOTSTRAP PLACEHOLDER'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">NETWORKX DIRECTED FLOW BOTTLENECK ANALYSIS</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Stage 1: Suppliers */}
        <div className="space-y-2 bg-[#0b1322] p-2.5 rounded border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. GULF CRUDE SUPPLIERS</div>
          {nodes.filter(n => n.type === 'source').map(node => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="truncate pr-1">
                <div className="font-semibold text-white text-[11px] truncate">{node.name}</div>
                <div className="text-[9px] text-slate-500">{node.region || 'Persian Gulf'}</div>
              </div>
              <span className={`px-1.5 py-0.5 border text-[9px] font-bold rounded ${getBadgeColor(node.stress_pct)}`}>
                {Math.round(node.stress_pct)}% STRESS
              </span>
            </div>
          ))}
        </div>

        {/* Stage 2: Chokepoints */}
        <div className="space-y-2 bg-[#0b1322] p-2.5 rounded border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. CHOKEPOINT RESTRICTION</div>
          {nodes.filter(n => n.type === 'chokepoint').map(node => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-semibold text-white text-[11px]">{node.name}</div>
                <div className="text-[9px] text-slate-500">{node.capacity_bpd ? `${(node.capacity_bpd / 1000000).toFixed(1)}M bpd Cap` : 'Chokepoint'}</div>
              </div>
              <span className={`px-1.5 py-0.5 border text-[9px] font-bold rounded ${getBadgeColor(node.stress_pct)}`}>
                {Math.round(node.stress_pct)}% SHOCK
              </span>
            </div>
          ))}
        </div>

        {/* Stage 3: Indian Ports */}
        <div className="space-y-2 bg-[#0b1322] p-2.5 rounded border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. INDIAN IMPORT TERMINALS</div>
          {nodes.filter(n => n.type === 'port').map(node => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="truncate pr-1">
                <div className="font-semibold text-white text-[11px] truncate">{node.name.split(' ')[0]}</div>
                <div className="text-[9px] text-slate-500">{node.capacity_bpd ? `${(node.capacity_bpd / 1000).toFixed(0)}k bpd` : 'Port Terminal'}</div>
              </div>
              <span className={`px-1.5 py-0.5 border text-[9px] font-bold rounded ${getBadgeColor(node.stress_pct)}`}>
                {Math.round(node.stress_pct)}%
              </span>
            </div>
          ))}
        </div>

        {/* Stage 4: Refineries & SPR - always includes all SPR nodes (not just whichever
            refineries happen to sort first), so this box's "SPR RESERVES" half of its title
            is never empty */}
        <div className="space-y-2 bg-[#0b1322] p-2.5 rounded border border-slate-800">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. REFINERIES & SPR RESERVES</div>
          {[...nodes.filter(n => n.type === 'refinery').slice(0, 3), ...nodes.filter(n => n.type === 'spr')].map(node => (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className="p-2 rounded bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 cursor-pointer flex items-center justify-between transition-colors"
            >
              <div className="truncate pr-1">
                <div className="font-semibold text-white text-[11px] truncate">{node.name.split(' ')[0]}</div>
                <div className="text-[9px] text-slate-500">{node.type.toUpperCase()} NODE</div>
              </div>
              <span className={`px-1.5 py-0.5 border text-[9px] font-bold rounded ${getBadgeColor(node.stress_pct)}`}>
                {Math.round(node.stress_pct)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Details Bar */}
      {selectedNode && (
        <div className="bg-[#0b1322] p-3 rounded border border-cyan-500/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="font-bold text-white uppercase">{selectedNode.name}</span>
              <span className="ml-2 text-[10px] text-slate-400 font-normal">
                (Baseline Capacity: {selectedNode.capacity_bpd ? `${(selectedNode.capacity_bpd / 1000).toFixed(0)}k bpd` : 'N/A'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded ${getBadgeColor(selectedNode.stress_pct)}`}>
              STRESS: {selectedNode.stress_pct.toFixed(1)}%
            </span>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};
