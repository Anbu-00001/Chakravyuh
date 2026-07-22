import React from 'react';

interface CrisisSitrepProps {
  vesselsCount?: number;
  isAISLive?: boolean;
  isIngestOnline?: boolean;
}

export const CrisisSitrep: React.FC<CrisisSitrepProps> = ({
  vesselsCount = 0,
  isAISLive = false,
  isIngestOnline = false
}) => {
  const daysSinceStart = Math.floor((Date.now() - new Date('2026-02-28').getTime()) / 86400000);

  return (
    <div className="bg-red-950/30 border-b border-red-900/50 px-5 py-1.5 flex items-center gap-3 font-mono text-[11px] overflow-hidden select-none">
      <span className="flex items-center gap-1.5 shrink-0 text-red-400 font-black uppercase tracking-wider">
        <span className={`w-1.5 h-1.5 rounded-full ${isIngestOnline ? 'bg-red-500 animate-pulse' : 'bg-slate-500'} `}></span>
        SITREP
      </span>
      <span className="text-slate-300 truncate">
        <strong className="text-red-300 uppercase">Live crisis</strong> — Day <strong className="text-white">{daysSinceStart}</strong> of Hormuz blockade ·{' '}
        <strong className="text-cyan-300">{vesselsCount}</strong> vessels tracked
        {isAISLive ? <span className="text-emerald-400"> (LIVE AIS)</span> : <span className="text-amber-400"> (SIMULATED)</span>}
        {' · '}9+ tankers attacked since Jul 6 · US airstrikes ongoing
      </span>
      <span className="ml-auto shrink-0 text-slate-500 text-[9px] tracking-wider hidden xl:inline flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${isIngestOnline ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
        <span>{isIngestOnline ? 'LIVE FEED' : 'RECONNECTING...'}</span>
        <span className="ml-2">SRC: WIKIPEDIA · CNBC · WASH POST · NPR</span>
      </span>
    </div>
  );
};
