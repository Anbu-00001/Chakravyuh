import React, { useState, useEffect } from 'react';
import { Wrench, Globe, AlertTriangle, Bell, RefreshCw } from 'lucide-react';
import { SIMULATE_API_URL } from '../config';

interface ComponentHealth {
  stress_pct: number;
  status: string;
}

interface RefineryReport {
  refinery_id: string;
  name: string;
  base_capacity_mmtpa: number;
  derated_capacity_mmtpa: number;
  capacity_loss_pct: number;
  crude_processed: string;
  composite_stress_score: number;
  health_status: string;
  components: Record<string, ComponentHealth>;
}

interface SectorReport {
  sector_id: string;
  name: string;
  tier: number;
  baseline_tbpd: number;
  allocated_tbpd: number;
  shortfall_tbpd: number;
  fulfillment_pct: number;
  status: string;
}

// source_attribution: converts /api/rationing/optimize's estimated_daily_gdp_loss_crores
// (INR crores) to approximate USD millions for HUD display. 1 crore = INR 10,000,000;
// at an assumed ~INR 83/USD exchange rate, crores -> USD millions ~= crores * (10,000,000 / 83,000,000)
// ~= crores * 0.1205. This is an illustrative approximation, not a live FX feed.
const CRORES_TO_USD_MILLIONS = 0.1205;

interface RefineryMaintenanceHUDProps {
  vesselsCount?: number;
  isAISLive?: boolean;
  setActiveTab?: (tab: string) => void;
  onOpenRealityLedger?: () => void;
}

export const RefineryMaintenanceHUD: React.FC<RefineryMaintenanceHUDProps> = ({
  vesselsCount = 0,
  isAISLive = false,
  setActiveTab,
  onOpenRealityLedger
}) => {
  const [selectedCrude, setSelectedCrude] = useState<string>('ARAB_LIGHT');
  const [daysInStress] = useState<number>(15);
  const [refineryReports, setRefineryReports] = useState<RefineryReport[]>([]);

  const [nationalDeficit, setNationalDeficit] = useState<number>(30);
  const [defenseSlider, setDefenseSlider] = useState<number>(100);
  const [retailSlider, setRetailSlider] = useState<number>(40);
  const [isApplyingRationing, setIsApplyingRationing] = useState<boolean>(false);
  const [sectorData, setSectorData] = useState<{
    allocated_supply: number;
    gdp_loss: number;
    sectors: SectorReport[];
  }>({ allocated_supply: 0, gdp_loss: 0, sectors: [] });

  // Overlays state
  const [showTankers, setShowTankers] = useState<boolean>(true);
  const [showChokepoints, setShowChokepoints] = useState<boolean>(true);
  const [showSPR, setShowSPR] = useState<boolean>(true);

  // Fetch Refinery Stress
  useEffect(() => {
    fetch(`${SIMULATE_API_URL}/api/simulate/refinery-stress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crude_grade: selectedCrude, days_in_stress: daysInStress })
    })
      .then(res => res.json())
      .then(data => {
        setRefineryReports(data.refineries || []);
      })
      .catch(err => {
        console.error('Refinery stress API error:', err);
      });
  }, [selectedCrude, daysInStress]);

  // Fetch Rationing Optimization (also callable directly from the EXECUTE RATIONING button)
  const applyRationing = async () => {
    setIsApplyingRationing(true);
    try {
      const res = await fetch(`${SIMULATE_API_URL}/api/rationing/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_deficit_pct: nationalDeficit,
          defense_slider: defenseSlider,
          retail_slider: retailSlider
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSectorData({
          allocated_supply: data.total_allocated_supply_tbpd || 0,
          gdp_loss: data.estimated_daily_gdp_loss_crores || 0,
          sectors: data.sectors || []
        });
      }
    } catch (err) {
      console.error('Rationing API error:', err);
    } finally {
      setIsApplyingRationing(false);
    }
  };

  useEffect(() => {
    applyRationing();
  }, [nationalDeficit, defenseSlider, retailSlider]);

  // Derive an honest system-status summary from the real /api/simulate/refinery-stress
  // response instead of ever asserting nominal status unconditionally.
  const criticalRefineries = refineryReports.filter(r => r.health_status === 'CRITICAL_STRESS');
  const elevatedRefineries = refineryReports.filter(r => r.health_status === 'ELEVATED_RISK');
  let systemStatusText: string;
  let systemStatusColorClass: string;
  let systemStatusDotClass: string;
  if (refineryReports.length === 0) {
    systemStatusText = 'AWAITING TELEMETRY';
    systemStatusColorClass = 'text-slate-400';
    systemStatusDotClass = 'bg-slate-400';
  } else if (criticalRefineries.length > 0) {
    systemStatusText = `${criticalRefineries.length} REFINER${criticalRefineries.length === 1 ? 'Y' : 'IES'} CRITICAL_STRESS${elevatedRefineries.length > 0 ? `, ${elevatedRefineries.length} ELEVATED_RISK` : ''}`;
    systemStatusColorClass = 'text-red-400';
    systemStatusDotClass = 'bg-red-400';
  } else if (elevatedRefineries.length > 0) {
    systemStatusText = `${elevatedRefineries.length} REFINER${elevatedRefineries.length === 1 ? 'Y' : 'IES'} ELEVATED_RISK`;
    systemStatusColorClass = 'text-amber-400';
    systemStatusDotClass = 'bg-amber-400';
  } else {
    systemStatusText = 'ALL SYSTEMS NOMINAL';
    systemStatusColorClass = 'text-cyan-400';
    systemStatusDotClass = 'bg-cyan-400';
  }

  return (
    <div className="flex-1 bg-[#040810] text-slate-100 p-4 overflow-y-auto font-mono space-y-4 select-none">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-cyan-900/60 pb-3 gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h1 className="text-sm font-black text-cyan-400 tracking-wide font-sans">
            Refinery SCADA &amp; Rationing Cockpit
          </h1>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 bg-[#080d1a] border border-cyan-800/80 px-3 py-1 rounded">
            <span className="text-slate-400">CRUDE:</span>
            <select
              value={selectedCrude}
              onChange={(e) => setSelectedCrude(e.target.value)}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ARAB_LIGHT" className="bg-[#040810] text-cyan-400">ARAB LIGHT</option>
              <option value="BASRAH_HEAVY" className="bg-[#040810] text-cyan-400">BASRAH HEAVY</option>
              <option value="RUSSIAN_URALS" className="bg-[#040810] text-cyan-400">RUSSIAN URALS</option>
              <option value="MABAN" className="bg-[#040810] text-cyan-400">MABAN UAE</option>
            </select>
          </div>

          {showTankers && (
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isAISLive ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span>
              <span>{isAISLive ? 'AIS LIVE' : 'SIMULATED'}: {vesselsCount.toLocaleString()} VESSELS</span>
            </div>
          )}

          {showChokepoints && (
            <div className="flex items-center gap-1.5 text-red-400 bg-red-950/60 border border-red-800 px-2.5 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>HORMUZ: CRITICAL</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-3">
            <button onClick={() => setActiveTab?.('overview')} title="Go to Tactical Map" className="p-0.5 cursor-pointer">
              <Globe className="w-4 h-4 hover:text-cyan-400" />
            </button>
            <button onClick={() => setActiveTab?.('wargame')} title="Go to Adversarial Wargame" className="p-0.5 cursor-pointer">
              <AlertTriangle className="w-4 h-4 hover:text-red-400" />
            </button>
            <button onClick={() => onOpenRealityLedger?.()} title="Open Reality Ledger" className="p-0.5 cursor-pointer">
              <Bell className="w-4 h-4 hover:text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Refinery SCADA, Center = Overlays & Stat Cards, Right = Fuel Rationing Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: REFINERY SCADA (7 Refineries) */}
        <div className="lg:col-span-4 bg-[#080d1a] border border-cyan-900/60 p-4 rounded space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-black text-white tracking-widest uppercase">REFINERY SCADA</h2>
            <span className="text-[10px] text-cyan-400 font-bold">CRUDE: {selectedCrude.replace('_', ' ')}</span>
          </div>

          <div className="space-y-3">
            {/* Loading state uses the real 7 modeled refineries (data/seed.json) with no
                fabricated load/stress numbers - actual values only render once
                /api/simulate/refinery-stress responds. */}
            {(refineryReports.length > 0 ? refineryReports : [
              { name: 'JAMNAGAR', loading: true },
              { name: 'VADINAR', loading: true },
              { name: 'MANGALURU', loading: true },
              { name: 'KOCHI', loading: true },
              { name: 'MUMBAI', loading: true },
              { name: 'PARADIP', loading: true },
              { name: 'VISAKHAPATNAM', loading: true }
            ]).map((ref: any, idx: number) => {
              const name = ref.name.split(' ')[0].toUpperCase();
              const isLoading = !!ref.loading;
              const loadPct = isLoading ? null : Math.round(100 - (ref.capacity_loss_pct ?? 15));
              const isHighStress = !isLoading && loadPct !== null && loadPct >= 90;

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-200">{name}</span>
                    <span className={isLoading ? 'text-slate-500' : (isHighStress ? 'text-red-400' : 'text-cyan-400')}>
                      {isLoading ? 'LOADING…' : `${loadPct}% LOAD`}
                    </span>
                  </div>

                  {/* 4 Unit Block Indicators - only reflect real per-component stress_pct
                      from the backend; no color is invented while loading. */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {['CDU', 'VDU', 'FCCU', 'DHDS'].map((unit) => {
                      const unitKey = unit === 'CDU' ? 'CDU_distillation' : unit === 'VDU' ? 'VDU_vacuum' : unit === 'FCCU' ? 'FCCU_cracking' : 'DHDS_desulfurization';
                      const unitStress = ref.components?.[unitKey]?.stress_pct;
                      const isStressedBlock = typeof unitStress === 'number' && unitStress > 70;

                      return (
                        <div key={unit} className="space-y-0.5">
                          <div className={`h-4 rounded-sm ${isLoading ? 'bg-slate-800 animate-pulse' : (isStressedBlock ? 'bg-[#ff7b7b]' : 'bg-[#00f3ff]')}`}></div>
                          <div className="text-[8px] text-slate-500 font-bold text-center">{unit}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`pt-2 border-t border-slate-800 text-[10px] font-bold flex items-center gap-1.5 ${systemStatusColorClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${systemStatusDotClass}`}></span>
            <span>{systemStatusText}</span>
          </div>
        </div>

        {/* Center Column: Tactical Overlays & Stat HUD */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          
          {/* Tactical Overlays Floating Card */}
          <div className="bg-[#080d1a] border border-cyan-500/80 p-4 rounded space-y-3 shadow-lg shadow-cyan-950/40">
            <h3 className="text-xs font-black text-cyan-400 tracking-wider uppercase border-b border-cyan-900/60 pb-1.5">
              TACTICAL OVERLAYS
            </h3>

            <div className="space-y-2 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer text-cyan-300">
                <input
                  type="checkbox"
                  checked={showTankers}
                  onChange={(e) => setShowTankers(e.target.checked)}
                  className="accent-cyan-400"
                />
                <span>TANKER ROUTES (AIS)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#ff7b7b]">
                <input
                  type="checkbox"
                  checked={showChokepoints}
                  onChange={(e) => setShowChokepoints(e.target.checked)}
                  className="accent-red-400"
                />
                <span>CHOKEPOINT THREATS</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                <input
                  type="checkbox"
                  checked={showSPR}
                  onChange={(e) => setShowSPR(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>SPR CAVERNS (VIZ/MNG/PAD)</span>
              </label>
            </div>
          </div>

          {/* Central SPR Metric Box */}
          {showSPR && (
            <div className="bg-[#080d1a] border border-cyan-900/60 p-4 rounded grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-bold">SPR VOL</div>
                <div className="text-xl font-black text-cyan-400 mt-1">5.33MMT</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold">DAYS COVER</div>
                <div className="text-xl font-black text-cyan-400 mt-1">9.5D</div>
              </div>
            </div>
          )}

          {/* Static decorative HUD coordinate readout — not tied to any tracked asset or live feed */}
          <div className="bg-[#080d1a] border border-slate-800 p-3 rounded text-center text-xs text-cyan-400 font-bold">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide mb-1">Ops Command Reference (Static)</div>
            LAT: 12.9716° N | LONG: 77.5946° E
          </div>
        </div>

        {/* Right Column: FUEL RATIONING MATRIX */}
        <div className="lg:col-span-4 bg-[#080d1a] border border-cyan-900/60 p-4 rounded space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-black text-white tracking-widest uppercase border-b border-slate-800 pb-2">
              FUEL RATIONING MATRIX
            </h2>

            {/* Live Policy Controls - drives /api/rationing/optimize */}
            <div className="space-y-3 pt-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>NATIONAL CRUDE DEFICIT</span>
                  <span className="text-red-400">{nationalDeficit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={nationalDeficit}
                  onChange={(e) => setNationalDeficit(Number(e.target.value))}
                  className="w-full accent-red-400 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>DEFENSE PROTECTION QUOTA</span>
                  <span className="text-cyan-400">{defenseSlider}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={defenseSlider}
                  onChange={(e) => setDefenseSlider(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>RETAIL / COMMERCIAL QUOTA</span>
                  <span className="text-amber-400">{retailSlider}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={retailSlider}
                  onChange={(e) => setRetailSlider(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Priority Progress Bars - bound to live /api/rationing/optimize response */}
            <div className="space-y-3 pt-3">
              {sectorData.sectors.length === 0 && (
                <div className="text-[10px] text-slate-500 italic">Loading live sectoral allocation...</div>
              )}
              {sectorData.sectors
                .slice()
                .sort((a, b) => a.tier - b.tier)
                .map((s) => {
                  const barColor =
                    s.status === 'FULL_PROTECTION' ? 'bg-cyan-400' :
                    s.status === 'RATIONED' ? 'bg-amber-400' : 'bg-[#ff7b7b]';
                  const textColor =
                    s.status === 'FULL_PROTECTION' ? 'text-cyan-400' :
                    s.status === 'RATIONED' ? 'text-amber-400' : 'text-[#ff7b7b]';
                  return (
                    <div key={s.sector_id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-200">{s.name.toUpperCase()}</span>
                        <span className={textColor}>{Math.round(s.fulfillment_pct)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded overflow-hidden border border-slate-800">
                        <div
                          className={`h-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, s.fulfillment_pct))}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Impact GDP Loss Box - gdp_loss (Rs Cr/day) from the live rationing API is converted
              to USD using an approximate ~Rs 83/USD rate (*0.12); both the underlying Cr figure
              and this conversion are modeled estimates, see rationing_policy.py source_attribution */}
          <div className="bg-[#18080c] border border-red-800/80 p-4 rounded space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">PROJECTED IMPACT</div>
            <div className="text-xl font-black text-red-500">
              DAILY GDP LOSS: {sectorData.gdp_loss ? `-$${Math.round(sectorData.gdp_loss * CRORES_TO_USD_MILLIONS)}M` : 'AWAITING DATA'}
            </div>
            <div className="text-[9px] text-slate-500 italic uppercase">
              SIMULATION T+48H POST-INTERRUPTION
            </div>
          </div>

          {/* Execute Rationing Action Button - re-applies current sliders against /api/rationing/optimize */}
          <button
            onClick={applyRationing}
            disabled={isApplyingRationing}
            className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 text-black font-black text-xs py-2.5 rounded uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isApplyingRationing ? 'animate-spin' : ''}`} />
            <span>{isApplyingRationing ? 'APPLYING POLICY...' : 'EXECUTE RATIONING'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
