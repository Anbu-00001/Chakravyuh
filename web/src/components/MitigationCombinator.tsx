import React from 'react';
import { Sliders, CheckSquare, Square } from 'lucide-react';

export interface MitigationOption {
  id: string;
  name: string;
  // Modeled estimate from the static planning catalog only - NOT a live simulation result.
  // The headline "TOTAL RESTORED" badge below is driven exclusively by realDaysRestored,
  // which comes from the real /api/simulate causal-graph trajectories.
  estDaysRestored: number;
  costUsdM: number;
  implHours: number;
  description: string;
}

interface MitigationCombinatorProps {
  activeMitigations: string[];
  onToggleMitigation: (id: string) => void;
  onClearAll: () => void;
  // Real day-30 buffer delta (mitigated vs. unmitigated) computed by SimulationControls from
  // the actual /api/simulate trajectories - null until a live simulation with this combination
  // has returned. This is the ONLY source for the headline number; never a client-side sum.
  realDaysRestored: number | null;
  isSimulating?: boolean;
}

const AVAILABLE_MITIGATIONS: MitigationOption[] = [
  {
    id: 'spr_release',
    name: 'SPR Strategic Drawdown & Cargo Swap',
    estDaysRestored: 18.5,
    costUsdM: 120,
    implHours: 48,
    description: 'Inject 1.5 MMT crude from Visakhapatnam & Mangaluru reserves while re-routing Non-Hormuz West African cargoes to Western refineries.'
  },
  {
    id: 'cape_reroute',
    name: 'Cape Reroute Premium Subsidization',
    estDaysRestored: 14.2,
    costUsdM: 210,
    implHours: 72,
    description: 'Provide war-risk premium subsidies for Indian-flagged tankers navigating Cape of Good Hope with +12-knot speed acceleration.'
  },
  {
    id: 'demand_control',
    name: 'Inter-State Demand Quotas & Rationing',
    estDaysRestored: 22.0,
    costUsdM: 450,
    implHours: 24,
    description: 'Invoke emergency LPG & diesel allocation protocols for non-essential industrial sector to preserve 20 days buffer.'
  }
];

export const MitigationCombinator: React.FC<MitigationCombinatorProps> = ({
  activeMitigations,
  onToggleMitigation,
  onClearAll,
  realDaysRestored,
  isSimulating = false
}) => {
  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-4 rounded font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-cyan-400 tracking-wider">MULTI-STRATEGY MITIGATION COMBINATOR</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold ${realDaysRestored === null || isSimulating ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isSimulating
              ? 'RE-SIMULATING…'
              : realDaysRestored === null
                ? 'AWAITING LIVE SIMULATION…'
                : `TOTAL RESTORED: +${realDaysRestored.toFixed(1)} DAYS (LIVE SIM)`}
          </span>
          {activeMitigations.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] text-red-400 hover:text-red-300 underline font-bold"
            >
              RESET COMBINATION
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {AVAILABLE_MITIGATIONS.map(m => {
          const isActive = activeMitigations.includes(m.id);
          return (
            <div
              key={m.id}
              onClick={() => onToggleMitigation(m.id)}
              className={`p-3 rounded border cursor-pointer transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#0b1322] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-white leading-tight">{m.name}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{m.description}</p>

              <div className="flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-2 font-bold">
                <span
                  className="text-slate-500 font-normal italic"
                  title="Modeled planning estimate from the static catalog - not the live simulation result"
                >
                  ~{m.estDaysRestored.toFixed(1)}D (modeled estimate)
                </span>
                <span className="text-slate-400">${m.costUsdM}M USD</span>
                <span className="text-cyan-300">{m.implHours}h RUNTIME</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
