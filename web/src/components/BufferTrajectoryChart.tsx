import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

export interface TrajectoryPoint {
  day: number;
  days_of_cover: number;
  inbound_flow_bpd: number;
  daily_deficit_bpd: number;
  refinery_throughput_pct: number;
  retail_price_impact_inr: number;
}

interface BufferTrajectoryChartProps {
  unmitigatedTrajectory?: TrajectoryPoint[];
  mitigatedTrajectory?: TrajectoryPoint[];
  severityPct: number;
  activeMitigations: string[];
}

export const BufferTrajectoryChart: React.FC<BufferTrajectoryChartProps> = ({
  unmitigatedTrajectory = [],
  mitigatedTrajectory = [],
  severityPct
  // activeMitigations is kept in the props contract (SimulationControls.tsx passes it)
  // but is no longer used to fabricate a trajectory - see hasData below.
}) => {
  // Only ever plot points that came from the real backend trajectories - never
  // invent a curve. If the unmitigated trajectory hasn't arrived yet (e.g. before the
  // first simulate call resolves, or the backend is unreachable), we render an honest
  // empty state below instead of a fabricated line.
  const hasData = unmitigatedTrajectory.length > 0;

  const chartData = hasData
    ? unmitigatedTrajectory.map((unmit) => {
        const mit = mitigatedTrajectory.find(p => p.day === unmit.day);
        return {
          day: `Day ${unmit.day}`,
          unmitigated: unmit.days_of_cover,
          mitigated: mit ? mit.days_of_cover : undefined,
          priceImpact: unmit.retail_price_impact_inr
        };
      })
    : [];

  return (
    <div className="bg-[#080d19] border border-cyan-900/60 p-4 rounded font-mono space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-xs font-bold text-cyan-400 tracking-wider">30-DAY CRUDE RESERVE DEPLETION TRAJECTORY</h3>
          <p className="text-[10px] text-slate-400">CAUSAL ENGINE NETWORK SHOCK SIMULATION ({severityPct}% SHOCK)</p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-red-500 rounded font-bold"></span>
            <span className="text-red-400">UNMITIGATED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 rounded font-bold"></span>
            <span className="text-emerald-400">MITIGATED COMBINATION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 border border-dashed border-amber-400"></span>
            <span className="text-amber-300">20-DAY MIN CRITICAL</span>
          </div>
        </div>
      </div>

      <div className="h-[210px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 9 }} interval={4} />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[20, 90]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0b1322', borderColor: '#0891b2', fontSize: '11px', color: '#f8fafc' }}
              />
              <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '20-DAY EMERGENCY FLOOR', fill: '#f59e0b', fontSize: 9 }} />
              <Line
                type="monotone"
                dataKey="unmitigated"
                name="Unmitigated (Days)"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="mitigated"
                name="Mitigated Combination (Days)"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-center px-8">
            <p className="text-[11px] text-slate-500 font-mono tracking-wide">
              Run a simulation to see the causal engine&apos;s trajectory
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
