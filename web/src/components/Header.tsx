import React from 'react';
import { Shield, Bell, AlertOctagon, Settings, User, Wifi, WifiOff } from 'lucide-react';
import type { CountryBaseline } from '../types';

interface HeaderProps {
  baseline?: CountryBaseline;
  vesselsCount: number;
  isAISLive: boolean;
  onOpenRealityLedger: () => void;
  selectedCountry: string;
  onSelectCountry: (c: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isIngestOnline?: boolean;
  isSimulateOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  vesselsCount,
  isAISLive,
  onOpenRealityLedger,
  selectedCountry,
  onSelectCountry,
  activeTab,
  setActiveTab,
  isIngestOnline = false,
  isSimulateOnline = false
}) => {
  return (
    <header className="bg-[#04070d] border-b border-cyan-900/60 px-5 py-2.5 flex items-center justify-between gap-4 font-mono select-none">
      {/* Left Logo + Nav Tabs */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <h1 className="text-xl font-black tracking-widest text-cyan-400 font-mono flex items-center gap-2 uppercase">
            CHAKRAVYUH <span className="text-[10px] text-slate-500 font-normal border border-cyan-900/80 px-1.5 py-0.5 rounded">WAR-ROOM</span>
          </h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-bold tracking-wider">
          {['India', 'Japan', 'Philippines'].map((country) => (
            <button
              key={country}
              onClick={() => onSelectCountry(country)}
              className={`pb-1 transition-all cursor-pointer ${
                selectedCountry === country
                  ? 'text-cyan-400 border-b-2 border-cyan-400 font-black'
                  : 'text-slate-400 border-b-2 border-transparent hover:text-slate-200'
              }`}
            >
              {country}
            </button>
          ))}

          <span className="text-slate-700 font-normal">|</span>

          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'text-cyan-400 border-cyan-400 font-bold' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Tactical Map
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'simulator' ? 'text-cyan-400 border-cyan-400 font-bold' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Causal Simulator
          </button>
          <button
            onClick={() => setActiveTab('wargame')}
            className={`pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wargame' ? 'text-red-400 border-red-400 font-bold' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>Adversarial Wargame</span>
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'maintenance' ? 'text-cyan-400 border-cyan-400 font-bold' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Refinery SCADA & Rationing</span>
          </button>
        </nav>
      </div>

      {/* Center Flashing Crisis Alert Badge */}
      <div className="hidden lg:flex items-center gap-2 bg-red-950/40 border border-red-500/60 px-4 py-1.5 rounded text-xs font-bold text-red-400 shadow-lg shadow-red-950/50">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
        <span className="uppercase tracking-wider">STRAIT OF HORMUZ: HIGH ALERT</span>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-3">
        {/* Connection Status Badges */}
        <div className="hidden lg:flex items-center gap-2 mr-1">
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${isIngestOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {isIngestOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            SENSE
          </span>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${isSimulateOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {isSimulateOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            SIM
          </span>
        </div>

        {/* AIS Live Vessel Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1322] border border-cyan-900/80 text-[10px] font-bold">
          <span className={`w-1.5 h-1.5 rounded-full ${isAISLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className={isAISLive ? 'text-emerald-400' : 'text-amber-400'}>
            {isAISLive ? `AIS LIVE (${vesselsCount} SHIPS)` : `SIMULATED (${vesselsCount} SHIPS)`}
          </span>
        </div>

        <button
          onClick={() => setActiveTab('simulator')}
          className="border border-red-500/80 bg-red-950/30 hover:bg-red-900/50 text-red-400 font-black text-xs px-3.5 py-1.5 rounded uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-950/40 cursor-pointer transition-colors"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>CRISIS_ALERT</span>
        </button>

        <div className="flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-3">
          <button onClick={onOpenRealityLedger} title="Reality Ledger Assets" className="hover:text-cyan-400 transition-colors p-1">
            <Settings className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
          </button>
          <button onClick={() => setActiveTab('overview')} title="Live Crisis Alerts & Intel Feed" className="hover:text-cyan-400 transition-colors p-1">
            <Bell className="w-4 h-4" />
          </button>
          <button onClick={onOpenRealityLedger} title="Strategic Reserve Reality Ledger (§3)" className="hover:text-cyan-400 transition-colors p-1">
            <Shield className="w-4 h-4 text-cyan-400" />
          </button>

          {/* User Avatar */}
          <div className="w-7 h-7 rounded border border-cyan-500/60 bg-cyan-950/80 flex items-center justify-center text-cyan-300 font-bold text-xs ml-1 shadow-inner">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
