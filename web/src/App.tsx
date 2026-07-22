import { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { CrisisSitrep } from './components/CrisisSitrep';
import { WarRoomMap } from './components/WarRoomMap';
import type { DynamicRefineryStatus } from './components/WarRoomMap';
import { NewsFeed } from './components/NewsFeed';
import { PriceTicker } from './components/PriceTicker';
import { SimulationControls } from './components/SimulationControls';
import { WargameCockpit } from './components/WargameCockpit';
import { RefineryMaintenanceHUD } from './components/RefineryMaintenanceHUD';
import { RealityLedgerModal } from './components/RealityLedgerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { Vessel, SPRSite, Refinery, Chokepoint, NewsArticle, PriceData, CountryBaseline } from './types';
import { Shield, Factory, Ship, BarChart3, Database, Crosshair, Wifi, WifiOff } from 'lucide-react';
import { INGEST_API_URL, SIMULATE_API_URL } from './config';

import seedFile from '../../data/seed.json';

interface Financials {
  btc_usd: number;
  btc_change_24h: number;
  usd_inr: number;
  usd_inr_change_24h: number;
}

export function App() {
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [isRealityLedgerOpen, setIsRealityLedgerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isIngestOnline, setIsIngestOnline] = useState<boolean>(false);
  const [isSimulateOnline, setIsSimulateOnline] = useState<boolean>(false);
  const [systemTime, setSystemTime] = useState<string>('');
  const sseRef = useRef<EventSource | null>(null);

  const [baseline, setBaseline] = useState<CountryBaseline>(seedFile.country_baseline as any);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const sprSites: SPRSite[] = seedFile.spr_sites as any;
  const refineries: Refinery[] = seedFile.refineries as any;
  const chokepoints: Chokepoint[] = seedFile.chokepoints as any;

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [prices, setPrices] = useState<PriceData | undefined>(undefined);
  const [financials, setFinancials] = useState<Financials>({
    btc_usd: 64120.00,
    btc_change_24h: 0.0,
    usd_inr: 83.43,
    usd_inr_change_24h: 0.0
  });

  const [refineryStatuses, setRefineryStatuses] = useState<DynamicRefineryStatus[]>([]);
  const [domesticReservePct, setDomesticReservePct] = useState<number>(82.0);
  const [transitRiskScore, setTransitRiskScore] = useState<number>(9.4);
  const [isAISLive, setIsAISLive] = useState<boolean>(false);

  // System time ticker
  useEffect(() => {
    const tick = () => setSystemTime(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // SSE stream for real-time data
  useEffect(() => {
    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
      es = new EventSource(`${INGEST_API_URL}/api/events`);
      sseRef.current = es;

      es.onopen = () => {
        setIsIngestOnline(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.ships) {
            setVessels(data.ships);
            setIsIngestOnline(true);
          }
          if (data.news) setNews(data.news);
          if (data.prices) setPrices(data.prices);
          if (data.financials) setFinancials(data.financials);
          if (data.refineries) setRefineryStatuses(data.refineries);
          if (data.ships) {
            const hasLive = data.ships.some((s: any) => s.isLiveAIS);
            setIsAISLive(hasLive);
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      };

      es.onerror = () => {
        setIsIngestOnline(false);
        es.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (es) es.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Poll simulate backend health
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${SIMULATE_API_URL}/health`);
        if (res.ok && !cancelled) setIsSimulateOnline(true);
        else if (!cancelled) setIsSimulateOnline(false);
      } catch {
        if (!cancelled) setIsSimulateOnline(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Fallback polling if SSE fails
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isIngestOnline) {
        try {
          const [shipsRes, newsRes, pricesRes, finRes, refRes] = await Promise.all([
            fetch(`${INGEST_API_URL}/api/ships`),
            fetch(`${INGEST_API_URL}/api/news`),
            fetch(`${INGEST_API_URL}/api/prices`),
            fetch(`${INGEST_API_URL}/api/financials`),
            fetch(`${INGEST_API_URL}/api/refineries/status`)
          ]);
          if (shipsRes.ok) {
            const data = await shipsRes.json();
            if (data.ships) setVessels(data.ships);
            setIsAISLive(!!data.aisConnected);
          }
          if (newsRes.ok) setNews((await newsRes.json()).news);
          if (pricesRes.ok) setPrices(await pricesRes.json());
          if (finRes.ok) setFinancials(await finRes.json());
          if (refRes.ok && Array.isArray(await refRes.json())) setRefineryStatuses(await refRes.json());
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isIngestOnline]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    if (country === 'India') {
      setBaseline(seedFile.country_baseline as any);
      setDomesticReservePct(82.0);
      setTransitRiskScore(9.4);
    } else if (country === 'Japan') {
      setBaseline({
        name: "Japan",
        crude_import_dependency_pct: 99.7,
        spr_capacity_mmt: 36.0,
        spr_cover_full_days: 146.0,
        spr_cover_typical_days: 120.0,
        omc_commercial_stock_days: 90.0,
        total_buffer_days: 247.0,
        buffer_range_days: [230, 260],
        diversified_source_countries: 14,
        last_updated: "2026-07-21",
        source: "METI/JOGMEC national SPR figures + Japan Times (Mar 2026 SPR release); verified 2026-07-21"
      });
      setDomesticReservePct(95.0);
      setTransitRiskScore(9.1);
    } else if (country === 'Philippines') {
      setBaseline({
        name: "Philippines",
        crude_import_dependency_pct: 98.2,
        spr_capacity_mmt: 0.9,
        spr_cover_full_days: 15.0,
        spr_cover_typical_days: 10.0,
        omc_commercial_stock_days: 30.0,
        total_buffer_days: 45.0,
        buffer_range_days: [35, 55],
        diversified_source_countries: 8,
        last_updated: "2026-07-21",
        source: "DOE Philippines (45-day figure, Mar 2026); Philippines has no operational government SPR yet - PSPR is proposed, targeted 2027-2028. 'Reserve' capacity here reflects the private Subic Bay (PCSPC) commercial terminal, not a state reserve."
      });
      setDomesticReservePct(45.0);
      setTransitRiskScore(9.8);
    }
  };

  const handleRunSimulation = async (chokepoint: string, severity: number, mitigation?: string | string[]) => {
    // Bounded timeout: a stalled/unreachable backend must never leave the UI spinning forever mid-demo.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${SIMULATE_API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chokepoint,
          severity_pct: severity,
          mitigation_applied: mitigation
        }),
        signal: controller.signal
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("FastAPI simulation endpoint offline or timed out:", err);
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  };

  const handleRunStrategize = async (chokepoint: string, severity: number) => {
    // Bounded timeout: the LLM-backed agent loop can take longer, but must still recover
    // gracefully (never spin the "GENERATE AI PLAYBOOKS" button forever) if a provider hangs.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(`${SIMULATE_API_URL}/api/strategize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chokepoint, severity_pct: severity }),
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        return data.playbooks || null;
      }
    } catch (err) {
      console.warn("FastAPI strategize endpoint offline or timed out:", err);
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-slate-100 font-sans flex flex-col justify-between">
      {/* Top Navigation & Status Ticker */}
      <ErrorBoundary variant="panel" label="Header">
        <Header
          baseline={baseline}
          vesselsCount={vessels.length}
          isAISLive={isAISLive}
          onOpenRealityLedger={() => setIsRealityLedgerOpen(true)}
          selectedCountry={selectedCountry}
          onSelectCountry={handleCountryChange}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isIngestOnline={isIngestOnline}
          isSimulateOnline={isSimulateOnline}
        />
      </ErrorBoundary>

      {/* Live Crisis SITREP Strip */}
      <ErrorBoundary variant="panel" label="Crisis SITREP">
        <CrisisSitrep vesselsCount={vessels.length} isAISLive={isAISLive} isIngestOnline={isIngestOnline} />
      </ErrorBoundary>

      {/* Main Body with Vertical Sidebar */}
      <div className="flex flex-1 p-3 gap-3">
        {/* Vertical Icon Sidebar */}
        <aside className="w-14 bg-[#080d19] border border-cyan-900/60 rounded flex flex-col items-center py-4 gap-6 text-slate-400 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`p-2.5 rounded transition-colors ${activeTab === 'overview' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:text-cyan-400'}`}
            title="Strategic Defense Overview"
          >
            <Shield className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`p-2.5 rounded transition-colors ${activeTab === 'simulator' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:text-cyan-400'}`}
            title="Causal Graph Engine"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('wargame')}
            className={`p-2.5 rounded transition-colors ${activeTab === 'wargame' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'hover:text-red-400'}`}
            title="Adversarial NSA Wargame Cockpit"
          >
            <Crosshair className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`p-2.5 rounded transition-colors ${activeTab === 'maintenance' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:text-cyan-400'}`}
            title="Refinery Operations"
          >
            <Factory className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`p-2.5 rounded transition-colors ${activeTab === 'overview' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'hover:text-cyan-400'}`}
            title="Live Vessel Positions"
          >
            <Ship className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRealityLedgerOpen(true)}
            className="p-2.5 rounded hover:text-cyan-400 transition-colors"
            title="Strategic Reserve Assets"
          >
            <Database className="w-5 h-5" />
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-4 overflow-hidden">
          {activeTab === 'wargame' ? (
            <ErrorBoundary variant="panel" label="Wargame Cockpit">
              <WargameCockpit />
            </ErrorBoundary>
          ) : activeTab === 'maintenance' ? (
            <ErrorBoundary variant="panel" label="Refinery Maintenance HUD">
              <RefineryMaintenanceHUD
                vesselsCount={vessels.length}
                isAISLive={isAISLive}
                setActiveTab={setActiveTab}
                onOpenRealityLedger={() => setIsRealityLedgerOpen(true)}
              />
            </ErrorBoundary>
          ) : activeTab === 'simulator' ? (
            <ErrorBoundary variant="panel" label="Causal Graph Simulator">
              <SimulationControls
                onRunSimulation={handleRunSimulation}
                onRunStrategize={handleRunStrategize}
              />
            </ErrorBoundary>
          ) : (
            <>
              {/* Dynamic Tactical Map */}
              <ErrorBoundary variant="panel" label="Tactical Map">
                <WarRoomMap
                  vessels={vessels}
                  sprSites={sprSites}
                  refineries={refineries}
                  chokepoints={chokepoints}
                  refineryStatuses={refineryStatuses}
                  domesticReservePct={domesticReservePct}
                  transitRiskScore={transitRiskScore}
                  isAISLive={isAISLive}
                />
              </ErrorBoundary>

              {/* Simulation Controls Strip */}
              <ErrorBoundary variant="panel" label="Causal Graph Simulator">
                <SimulationControls
                  onRunSimulation={handleRunSimulation}
                  onRunStrategize={handleRunStrategize}
                />
              </ErrorBoundary>

              {/* Bottom Intel & Markets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ErrorBoundary variant="panel" label="News Feed">
                  <NewsFeed news={news.length > 0 ? news : seedFile.timeline_anchors.map(t => ({
                    title: `${t.title}: ${t.description}`,
                    url: "https://pib.gov.in",
                    source: "Crisis Ground-Truth Anchor",
                    seennow: t.date,
                    publishedAt: t.date,
                    topic: "Geopolitics"
                  }))} />
                </ErrorBoundary>
                <ErrorBoundary variant="panel" label="Price Ticker">
                  <PriceTicker prices={prices} financials={financials} />
                </ErrorBoundary>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Live Financial Ticker Footer Bar */}
      <footer className="bg-[#020408] border-t border-slate-800 px-5 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-6">
          <span className={`font-bold uppercase flex items-center gap-1.5 ${isIngestOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isIngestOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'} `}></span>
            <span>{isIngestOnline ? 'SENSE ONLINE' : 'SENSE OFFLINE'}</span>
          </span>
          <span className={`font-bold uppercase flex items-center gap-1.5 ${isSimulateOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isSimulateOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span>{isSimulateOnline ? 'SIM ENGINE' : 'SIM OFFLINE'}</span>
          </span>
          <span className="hidden md:inline text-slate-500">
            VESSELS: <strong className="text-slate-300">{vessels.length}</strong>
          </span>
          <span className="hidden md:inline text-slate-500">
            REFINERIES: <strong className="text-slate-300">{refineryStatuses.filter(r => r.status === 'OPTIMAL').length}/{refineryStatuses.length || 3} OPTIMAL</strong>
          </span>
          <span>
            USD/INR: <strong className="text-white">₹{financials.usd_inr.toFixed(2)}</strong>
          </span>
          <span>
            BTC/USD: <strong className="text-white">${financials.btc_usd.toLocaleString()}</strong> 
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-[10px]">
            {systemTime && <>{systemTime}</>}
          </span>
          <span className="text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">v4.2.1</span>
        </div>
      </footer>

      {/* Reality Ledger Slide-Over Drawer Modal */}
      <ErrorBoundary variant="panel" label="Reality Ledger">
        <RealityLedgerModal isOpen={isRealityLedgerOpen} onClose={() => setIsRealityLedgerOpen(false)} />
      </ErrorBoundary>
    </div>
  );
}
