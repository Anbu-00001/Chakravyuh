import React, { useState, useEffect } from 'react';
import { ShieldAlert, Crosshair, Cpu, RefreshCw, Award } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SIMULATE_API_URL } from '../config';

interface MonteCarloPoint {
  day: number;
  p10_optimistic: number;
  p50_expected: number;
  p90_worst: number;
}

interface AttackVector {
  id: string;
  target: string;
  severity_bump_pct: number;
  description: string;
}

// Real defined cost + a modeled severity-reduction (not an official figure) per countermeasure,
// used to actually re-drive the live backend Monte Carlo call - not a client-side approximation.
const COUNTERMEASURES = [
  { id: 'spr_drawdown', label: 'Drawdown Strategic Reserves (Visakhapatnam & Mangaluru)', costM: 120, severityReductionPct: 10 },
  { id: 'japan_swap', label: 'Activate Bilateral Japan Shibushi Crude Swap Protocol', costM: 180, severityReductionPct: 14 },
  { id: 'fleet_escort', label: 'Deploy Indian Navy Escorts + Speed Acceleration', costM: 240, severityReductionPct: 8 }
];

export const WargameCockpit: React.FC = () => {
  const [intensity, setIntensity] = useState<string>('HIGH');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isMitigating, setIsMitigating] = useState<boolean>(false);
  const [turnCount, setTurnCount] = useState<number>(1);
  const [redTeamData, setRedTeamData] = useState<any>(null);
  const [mitigatedMc, setMitigatedMc] = useState<any>(null);
  const [selectedMitigations, setSelectedMitigations] = useState<string[]>([]);

  const fetchRedTeamScenario = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`${SIMULATE_API_URL}/api/wargame/redteam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chokepoint: 'chk_hormuz', intensity })
      });
      if (res.ok) {
        const data = await res.json();
        setRedTeamData(data);
      }
    } catch (err) {
      console.error("Red-Team endpoint error:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    fetchRedTeamScenario();
  }, [intensity]);

  // Re-simulates against the REAL Monte Carlo engine at a genuinely reduced severity_pct
  // whenever the selected countermeasures change - not a client-side curve boost.
  useEffect(() => {
    if (selectedMitigations.length === 0 || !redTeamData) {
      setMitigatedMc(null);
      return;
    }
    const reduction = selectedMitigations.reduce((sum, id) => {
      const cm = COUNTERMEASURES.find(c => c.id === id);
      return sum + (cm?.severityReductionPct || 0);
    }, 0);
    const effectiveSeverity = Math.max(20, (redTeamData.composite_severity_pct || 85) - reduction);

    let cancelled = false;
    setIsMitigating(true);
    fetch(`${SIMULATE_API_URL}/api/simulate/montecarlo?chokepoint=chk_hormuz&severity_pct=${effectiveSeverity}&runs=100`)
      .then(res => res.json())
      .then(data => { if (!cancelled) setMitigatedMc(data); })
      .catch(err => console.error("Monte Carlo mitigation call failed:", err))
      .finally(() => { if (!cancelled) setIsMitigating(false); });
    return () => { cancelled = true; };
  }, [selectedMitigations, redTeamData]);

  const toggleMitigation = (id: string) => {
    if (selectedMitigations.includes(id)) {
      setSelectedMitigations(selectedMitigations.filter(m => m !== id));
    } else {
      setSelectedMitigations([...selectedMitigations, id]);
    }
  };

  const handleNextTurn = () => {
    setTurnCount(t => t + 1);
    fetchRedTeamScenario();
  };

  // Plots the live mitigated trajectory when countermeasures are active, otherwise the baseline -
  // both come from the same real backend Monte Carlo engine, never client-computed.
  const activeTrajectory = (selectedMitigations.length > 0 && mitigatedMc?.trajectory)
    ? mitigatedMc.trajectory
    : redTeamData?.trajectory;

  const chartData = activeTrajectory ? activeTrajectory.map((pt: MonteCarloPoint) => ({
    day: `Day ${pt.day}`,
    P90_Worst: pt.p90_worst,
    P50_Expected: pt.p50_expected,
    P10_Optimistic: pt.p10_optimistic
  })) : [];

  const daysRestored = (selectedMitigations.length > 0 && mitigatedMc)
    ? Math.max(0, mitigatedMc.p50_day_30 - (redTeamData?.p50_expected_buffer || 0))
    : 0;
  const totalBudgetM = selectedMitigations.reduce((sum, id) => {
    const cm = COUNTERMEASURES.find(c => c.id === id);
    return sum + (cm?.costM || 0);
  }, 0);

  return (
    <div className="bg-[#04070d] border border-cyan-900/60 p-5 rounded-lg space-y-6 font-mono select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-900/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-950/80 border border-red-500/60 rounded text-red-400">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2 font-sans">
              Adversarial Wargame Cockpit <span className="text-slate-500 font-mono text-xs">// Turn {turnCount}</span>
            </h2>
            <p className="text-[11px] text-slate-400">Closed-loop red-team vs. blue-team energy security simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">RED-TEAM THREAT LEVEL:</span>
          <div className="flex border border-slate-800 rounded overflow-hidden">
            {['MEDIUM', 'HIGH', 'CRITICAL'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                className={`px-3 py-1 text-[10px] font-bold transition-colors ${
                  intensity === lvl ? 'bg-red-600 text-white' : 'bg-[#080d19] text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextTurn}
            disabled={isEvaluating}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs rounded uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>PLAY NEXT TURN</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Active Red-Team Attack Vectors & Probabilistic Envelope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Red-Team Active Attack Vectors */}
        <div className="bg-[#080d19] border border-red-900/60 p-4 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>AI RED-TEAM ESCALATION VECTORS</span>
            </div>
            <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800">
              COMPOSITE: {redTeamData?.composite_severity_pct || 85}% SHOCK
            </span>
          </div>

          <div className="space-y-3">
            {redTeamData?.attack_vectors?.map((vec: AttackVector, idx: number) => (
              <div key={idx} className="bg-[#0d1527] border border-slate-800 p-3 rounded space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>► {vec.target}</span>
                  <span className="text-red-400">+{vec.severity_bump_pct}%</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{vec.description}</p>
              </div>
            ))}
          </div>

          {/* Blue-Team Counter-Measures Options */}
          <div className="pt-2 space-y-2 border-t border-slate-800">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>BLUE-TEAM INTERACTIVE COUNTER-MEASURES</span>
            </div>

            <div className="space-y-2 text-xs">
              {COUNTERMEASURES.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${
                    selectedMitigations.includes(opt.id)
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                      : 'bg-[#0d1527] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedMitigations.includes(opt.id)}
                      onChange={() => toggleMitigation(opt.id)}
                      className="accent-cyan-400"
                    />
                    <span className="font-bold text-[11px]">{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">${opt.costM}M</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Monte Carlo Probabilistic Reserve Envelope Chart */}
        <div className="lg:col-span-2 bg-[#080d19] border border-cyan-900/60 p-4 rounded space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-bold text-cyan-400 tracking-wider">MONTE CARLO PROBABILISTIC DEPLETION ENVELOPE (100 RUNS)</h3>
              <p className="text-[10px] text-slate-400">P10 OPTIMISTIC // P50 EXPECTED // P90 WORST-CASE STOCHASTIC SCENARIOS</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {selectedMitigations.length > 0 && (
                <span className="text-cyan-400 font-bold uppercase">{isMitigating ? 'Re-simulating…' : 'Mitigated'}</span>
              )}
              <span className="text-emerald-400 font-bold">
                P10: {(selectedMitigations.length > 0 ? mitigatedMc?.p10_day_30 : redTeamData?.p10_optimistic_buffer) ?? '—'} Days
              </span>
              <span className="text-amber-400 font-bold">
                P50: {(selectedMitigations.length > 0 ? mitigatedMc?.p50_day_30 : redTeamData?.p50_expected_buffer) ?? '—'} Days
              </span>
              <span className="text-red-400 font-bold">
                P90: {(selectedMitigations.length > 0 ? mitigatedMc?.p90_day_30 : redTeamData?.p90_worst_case_buffer) ?? '—'} Days
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 9 }} interval={4} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[15, 85]} />
                <Tooltip contentStyle={{ backgroundColor: '#0b1322', borderColor: '#0891b2', fontSize: '11px', color: '#f8fafc' }} />
                <Area type="monotone" dataKey="P10_Optimistic" stroke="#34d399" fill="#34d399" fillOpacity={0.15} name="P10 Optimistic" />
                <Area type="monotone" dataKey="P50_Expected" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="P50 Expected" />
                <Area type="monotone" dataKey="P90_Worst" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="P90 Worst-Case" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Strategy Summary Bar */}
          <div className="bg-[#0b1322] border border-cyan-900/80 p-3 rounded flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">ACTIVE COUNTER-STRATEGY EVALUATION:</span>
              <span className="text-emerald-400 font-bold">
                {selectedMitigations.length > 0
                  ? (isMitigating ? 'Re-simulating…' : `+${daysRestored.toFixed(1)} Days Restored`)
                  : 'Unmitigated Vulnerability'}
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">
              POLICY BUDGET: <strong className="text-white">${totalBudgetM}M USD</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
