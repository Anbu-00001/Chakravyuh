import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { BufferTrajectoryChart } from './BufferTrajectoryChart';
import type { TrajectoryPoint } from './BufferTrajectoryChart';
import { PipelineGraphView } from './PipelineGraphView';
import { MitigationCombinator } from './MitigationCombinator';

interface Playbook {
  id: string;
  rank: number;
  title: string;
  strategy: string;
  restored_cover_days: number;
  day_30_cover_days: number;
  cost_est_usd_m: number;
  implementation_hours: number;
  risk_score: string;
  critic_feedback?: string[];
  citations: string[];
}

interface SimulationControlsProps {
  onRunSimulation: (chokepoint: string, severity: number, mitigation?: string | string[]) => Promise<any>;
  onRunStrategize?: (chokepoint: string, severity: number) => Promise<Playbook[] | null>;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  onRunSimulation,
  onRunStrategize
}) => {
  const [severity, setSeverity] = useState<number>(65);
  const [activeMitigations, setActiveMitigations] = useState<string[]>([]);
  const [unmitigatedTrajectory, setUnmitigatedTrajectory] = useState<TrajectoryPoint[]>([]);
  const [mitigatedTrajectory, setMitigatedTrajectory] = useState<TrajectoryPoint[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isStrategizing, setIsStrategizing] = useState<boolean>(false);
  // These three cards are static illustrative examples shown before the user has ever
  // clicked "GENERATE AI PLAYBOOKS" - they are NOT live AI output. isPlaceholderPlaybooks
  // tracks that distinction so the UI can label them honestly until real data replaces them.
  const [isPlaceholderPlaybooks, setIsPlaceholderPlaybooks] = useState<boolean>(true);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([
    {
      id: "spr_release",
      rank: 1,
      title: "#1 Strategic Reserve Drawdown & Cargo Swap",
      strategy: "Automated swap logic with UAE littoral storage nodes to bypass choke-point backlogs.",
      restored_cover_days: 18.5,
      day_30_cover_days: 52.4,
      cost_est_usd_m: 120,
      implementation_hours: 48,
      risk_score: "LOW RISK",
      citations: [
        "Example citation - real citations appear after live generation"
      ]
    },
    {
      id: "cape_reroute",
      rank: 2,
      title: "#2 Cape Reroute Speed Acceleration",
      strategy: "Mandatory vessel speed optimization (+2.5 knots) for all chartered VLCCs rerouting via Cape.",
      restored_cover_days: 14.2,
      day_30_cover_days: 48.1,
      cost_est_usd_m: 210,
      implementation_hours: 72,
      risk_score: "MEDIUM RISK",
      citations: [
        "Example citation - real citations appear after live generation"
      ]
    },
    {
      id: "demand_control",
      rank: 3,
      title: "#3 Inter-State Demand Allocation Quotas",
      strategy: "Political friction overhead high. Redistribution of crude reserves based on refinery load criticality.",
      restored_cover_days: 22.0,
      day_30_cover_days: 55.9,
      cost_est_usd_m: 450,
      implementation_hours: 24,
      risk_score: "HIGH RISK",
      citations: [
        "Example citation - real citations appear after live generation"
      ]
    }
  ]);
  const [activeCitationModal, setActiveCitationModal] = useState<Playbook | null>(null);

  const triggerSim = async (sev: number, mitigations: string[]) => {
    setIsSimulating(true);
    try {
      const resUnmit = await onRunSimulation('chk_hormuz', sev, []);
      if (resUnmit && resUnmit.trajectory) {
        setUnmitigatedTrajectory(resUnmit.trajectory);
      }
      if (mitigations.length > 0) {
        const resMit = await onRunSimulation('chk_hormuz', sev, mitigations);
        if (resMit && resMit.trajectory) {
          setMitigatedTrajectory(resMit.trajectory);
        }
      } else {
        setMitigatedTrajectory([]);
      }
    } catch (err) {
      console.warn("Simulation trigger fallback:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    triggerSim(severity, activeMitigations);
  }, [severity]);

  const handleToggleMitigation = (id: string) => {
    let updated: string[];
    if (activeMitigations.includes(id)) {
      updated = activeMitigations.filter(m => m !== id);
    } else {
      updated = [...activeMitigations, id];
    }
    setActiveMitigations(updated);
    triggerSim(severity, updated);
  };

  const handleSimulate = (mitigationChoice?: string) => {
    let selectedList = activeMitigations;
    if (mitigationChoice) {
      selectedList = [mitigationChoice];
      setActiveMitigations([mitigationChoice]);
    }
    triggerSim(severity, selectedList);
  };

  // Derived from the real simulated trajectory (first day cover climbs back above the
  // 20-day emergency floor) - not a formula invented independently of the causal engine.
  const activeTrajectory = mitigatedTrajectory.length > 0 ? mitigatedTrajectory : unmitigatedTrajectory;
  const recoveryPoint = activeTrajectory.find(p => p.days_of_cover >= 20);
  const recoveryLabel = activeTrajectory.length === 0
    ? '—'
    : recoveryPoint ? `Day ${recoveryPoint.day}` : '>30D';

  // Real day-30 buffer delta between the two live /api/simulate trajectories - the same
  // "mitigated minus unmitigated" derivation WargameCockpit uses for its daysRestored figure
  // (mitigatedMc.p50_day_30 - redTeamData.p50_expected_buffer). This is what MitigationCombinator
  // shows as its headline number; it is never a client-side sum of the static catalog estimates.
  const unmitDay30 = unmitigatedTrajectory.find(p => p.day === 30);
  const mitDay30 = mitigatedTrajectory.find(p => p.day === 30);
  const realDaysRestored: number | null = activeMitigations.length === 0
    ? 0
    : (unmitDay30 && mitDay30 ? Math.max(0, mitDay30.days_of_cover - unmitDay30.days_of_cover) : null);

  const handleGeneratePlaybooks = async () => {
    setIsStrategizing(true);
    if (onRunStrategize) {
      const res = await onRunStrategize('chk_hormuz', severity);
      if (res && res.length > 0) {
        setPlaybooks(res);
        setIsPlaceholderPlaybooks(false);
      }
    }
    setIsStrategizing(false);
  };

  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-5 font-mono rounded space-y-5">
      {/* Header */}
      <div className="border-b border-cyan-900/60 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-cyan-400 tracking-wider font-sans">Causal Graph Simulator</h2>
          <p className="text-[11px] text-slate-500">NetworkX directed-graph shock propagation, re-simulated live</p>
        </div>
      </div>

      {/* Impact Scenario Control Box */}
      <div className="border border-cyan-500/40 p-4 bg-[#0b1322]/80 space-y-4 rounded">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">IMPACT SCENARIO</div>
            <div className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <span>Hormuz Transit Shock Severity:</span>
              <span className="text-cyan-400">{severity}% Drop</span>
            </div>
          </div>

          <div className="bg-[#060a12] border border-cyan-900/80 px-4 py-2 rounded text-center">
            <div className="text-[9px] text-slate-400 font-bold uppercase">Recovers Above 20D Cover</div>
            <div className="text-cyan-300 font-black text-sm font-mono">{recoveryLabel}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSimulate()}
              disabled={isSimulating}
              className="border-2 border-red-500/80 hover:bg-red-950/40 text-red-400 font-bold text-xs uppercase px-5 py-2.5 rounded flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-red-950/50"
            >
              <Zap className="w-4 h-4 text-red-400" />
              <span>{isSimulating ? "SIMULATING..." : "SIMULATE GRAPH SHOCK"}</span>
            </button>

            <button
              onClick={handleGeneratePlaybooks}
              disabled={isStrategizing}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#060a12] font-black text-xs uppercase px-5 py-2.5 rounded flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-500/30"
            >
              <Sparkles className="w-4 h-4 text-[#060a12]" />
              <span>{isStrategizing ? "RECALIBRATING..." : "GENERATE AI PLAYBOOKS"}</span>
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1 pt-2">
          <input
            type="range"
            min="20"
            max="100"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-bold">
            <span>26% (PARTIAL DELAY)</span>
            <span className="text-cyan-400">65% (CURRENT JULY 2026)</span>
            <span>100% (TOTAL CLOSURE)</span>
          </div>
        </div>
      </div>

      {/* 30-Day Buffer Depletion Trajectory Chart (Phase 2 Component) */}
      <BufferTrajectoryChart
        unmitigatedTrajectory={unmitigatedTrajectory}
        mitigatedTrajectory={mitigatedTrajectory}
        severityPct={severity}
        activeMitigations={activeMitigations}
      />

      {/* Multi-Strategy Mitigation Combinator (Phase 2 Component) */}
      <MitigationCombinator
        activeMitigations={activeMitigations}
        onToggleMitigation={handleToggleMitigation}
        onClearAll={() => {
          setActiveMitigations([]);
          triggerSim(severity, []);
        }}
        realDaysRestored={realDaysRestored}
        isSimulating={isSimulating}
      />

      {/* Pipeline Graph Topology Inspector (Phase 2 Component) */}
      <PipelineGraphView severityPct={severity} />

      {/* AI Planner-Critic Playbooks Ranking */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200 tracking-wider">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>AI PLANNER-CRITIC MITIGATION STRATEGIES</span>
          </div>
          <div className="flex items-center gap-2">
            {isPlaceholderPlaybooks && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[9px]">EXAMPLE - CLICK GENERATE FOR LIVE AI ANALYSIS</span>
            )}
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[9px]">PHASE 3: MULTI-TURN CRITIC LOOP ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              onClick={() => handleSimulate(pb.id)}
              className={`p-4 rounded border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                activeMitigations.includes(pb.id)
                  ? 'bg-cyan-950/80 border-cyan-400 shadow-xl shadow-cyan-950/60'
                  : 'bg-[#0b1322] border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    pb.risk_score.includes('LOW') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    pb.risk_score.includes('MEDIUM') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {pb.risk_score}
                  </span>
                  <span className="text-slate-500">⚙</span>
                </div>

                <div className="font-bold text-white text-sm mt-2">{pb.title}</div>
                <div className="text-emerald-400 font-bold text-xs mt-1">+{pb.restored_cover_days} Days Restored</div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{pb.strategy}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCitationModal(pb);
                  }}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>EXPLAIN TRACE</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Citation Modal */}
      {activeCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1322] w-full max-w-lg border border-cyan-500/60 p-5 rounded space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-cyan-400 text-sm">EXPLAINABILITY TRACE & CITATION OBJECT</h3>
              <button onClick={() => setActiveCitationModal(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="text-white font-bold">{activeCitationModal.title}</div>
              <p className="text-slate-300">{activeCitationModal.strategy}</p>
              {activeCitationModal.critic_feedback && activeCitationModal.critic_feedback.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="font-bold text-amber-300">Multi-Turn Critic Agent Evaluation:</div>
                  <ul className="space-y-1 text-slate-300 text-[11px] bg-[#060a12] p-2.5 rounded border border-slate-800">
                    {activeCitationModal.critic_feedback.map((f, i) => (
                      <li key={i} className="text-slate-300 font-mono">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="font-bold text-cyan-300 pt-2">Driving Telemetry & Seed Citations:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                {activeCitationModal.citations.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
