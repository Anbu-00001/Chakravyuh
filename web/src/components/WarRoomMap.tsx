import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Deck, TripsLayer } from 'deck.gl';
import type { Vessel, SPRSite, Refinery, Chokepoint } from '../types';
import { Navigation } from 'lucide-react';
import { INGEST_API_URL } from '../config';

export interface DynamicRefineryStatus {
  name: string;
  status: string;
  vesselCount: number;
  tier: string;
}

interface MapProps {
  vessels: Vessel[];
  sprSites: SPRSite[];
  refineries: Refinery[];
  chokepoints: Chokepoint[];
  refineryStatuses?: DynamicRefineryStatus[];
  domesticReservePct?: number;
  transitRiskScore?: number;
  isAISLive?: boolean;
}

const TRIPS_DATA = [
  {
    vendor: 'Hormuz Tanker Express',
    path: [
      [50.15, 26.65, 0],
      [56.30, 26.50, 300],
      [60.50, 24.20, 600],
      [66.80, 21.10, 900],
      [69.75, 22.42, 1200]
    ]
  },
  {
    vendor: 'Cape Reroute Fleet',
    path: [
      [18.47, -34.35, 0],
      [45.00, -25.00, 400],
      [65.00, 5.00, 800],
      [74.75, 13.20, 1200]
    ]
  }
];

export const WarRoomMap: React.FC<MapProps> = ({
  vessels,
  sprSites,
  refineries,
  chokepoints,
  refineryStatuses = [],
  domesticReservePct = 82,
  transitRiskScore = 9.4,
  isAISLive = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [animTime, setAnimTime] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || "sEllbauNPj1rwYoMcu4V";

  // Real measured round-trip latency to the ingest service, not a hardcoded number
  useEffect(() => {
    let cancelled = false;
    const pingLatency = async () => {
      const start = performance.now();
      try {
        await fetch(`${INGEST_API_URL}/api/health`);
        if (!cancelled) setLatencyMs(Math.round(performance.now() - start));
      } catch {
        if (!cancelled) setLatencyMs(null);
      }
    };
    pingLatency();
    const interval = setInterval(pingLatency, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Animation Loop for Deck.gl TripsLayer
  useEffect(() => {
    let reqId: number;
    const animate = () => {
      setAnimTime(t => (t + 2) % 1300);
      reqId = requestAnimationFrame(animate);
    };
    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, []);

  // Initialize MapLibre GL and Deck.gl Overlay
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const tileUrl = MAPTILER_KEY && MAPTILER_KEY !== 'your_maptiler_key_here'
      ? `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
      : 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'dark-basemap': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '&copy; CARTO & OpenStreetMap'
          }
        },
        layers: [
          {
            id: 'dark-basemap-layer',
            type: 'raster',
            source: 'dark-basemap',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [65.0, 18.5],
      zoom: 4.2,
      pitch: 30,
      bearing: -5
    });

    mapRef.current = map;

    const deck = new Deck({
      parent: mapContainerRef.current,
      style: { pointerEvents: 'none', position: 'absolute', zIndex: '2' },
      initialViewState: {
        longitude: 65.0,
        latitude: 18.5,
        zoom: 4.2,
        pitch: 30,
        bearing: -5
      },
      controller: false,
      layers: []
    });

    deckRef.current = deck;

    map.on('move', () => {
      const center = map.getCenter();
      deck.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing()
        }
      });
    });

    return () => {
      deck.finalize();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update deck.gl TripsLayer
  useEffect(() => {
    if (!deckRef.current) return;

    const tripsLayer = new TripsLayer({
      id: 'vessel-corridor-trips',
      data: TRIPS_DATA,
      getPath: (d: any) => d.path,
      getTimestamps: (d: any) => d.path.map((p: any) => p[2]),
      getColor: (d: any) => (d.vendor.includes('Hormuz') ? [239, 68, 68] : [52, 211, 153]),
      opacity: 0.85,
      widthMinPixels: 4,
      rounded: true,
      trailLength: 220,
      currentTime: animTime
    });

    deckRef.current.setProps({ layers: [tripsLayer] });
  }, [animTime]);

  // Render MapLibre Markers for Vessels, Refineries, SPR, Chokepoints
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Vessels Markers
    vessels.forEach(v => {
      const el = document.createElement('div');
      el.className = 'w-3 h-3 rounded-full bg-cyan-400 border-2 border-cyan-200 shadow-lg cursor-pointer hover:scale-125 transition-transform';
      el.title = `Vessel: ${v.name} (${v.type})`;
      el.addEventListener('click', () => setSelectedItem({ type: 'VESSEL', data: v }));
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([v.lng, v.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // 2. Refineries Markers
    refineries.forEach(r => {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-sm shadow-md cursor-pointer hover:scale-125 transition-transform flex items-center justify-center text-[8px] font-bold text-black';
      el.innerText = 'R';
      el.title = `Refinery: ${r.name}`;
      el.addEventListener('click', () => setSelectedItem({ type: 'REFINERY', data: r }));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([r.coordinates[1], r.coordinates[0]])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // 3. SPR Sites Markers
    sprSites.forEach(s => {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 bg-amber-400 border-2 border-slate-900 rounded-full shadow-md cursor-pointer hover:scale-125 transition-transform flex items-center justify-center text-[8px] font-bold text-black';
      el.innerText = 'S';
      el.title = `SPR Site: ${s.name}`;
      el.addEventListener('click', () => setSelectedItem({ type: 'SPR_SITE', data: s }));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([s.coordinates[1], s.coordinates[0]])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // 4. Chokepoints Markers
    chokepoints.forEach(c => {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 border-2 border-red-500 rounded-full flex items-center justify-center bg-red-950/60 text-red-400 font-bold text-[9px] cursor-pointer animate-pulse';
      el.innerText = '!';
      el.title = `Chokepoint: ${c.name}`;
      el.addEventListener('click', () => setSelectedItem({ type: 'CHOKEPOINT', data: c }));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.coordinates[1], c.coordinates[0]])
        .addTo(map);
      markersRef.current.push(marker);
    });

  }, [vessels, sprSites, refineries, chokepoints]);

  // Loading-state fallback only (before /api/refineries/status responds) - status/vesselCount
  // are not fabricated real-time claims, just an honest "no telemetry yet" placeholder.
  const defaultRefineryStatuses: DynamicRefineryStatus[] = [
    { name: "JAMNAGAR", status: "STANDBY", vesselCount: 0, tier: "Tier A" },
    { name: "VADINAR", status: "STANDBY", vesselCount: 0, tier: "Tier A" },
    { name: "MANGALURU", status: "STANDBY", vesselCount: 0, tier: "Tier A" }
  ];

  const activeRefineries = refineryStatuses.length > 0 ? refineryStatuses : defaultRefineryStatuses;

  return (
    <div className="relative w-full h-[540px] rounded-lg overflow-hidden bg-[#04070d] border border-cyan-900/60 font-mono select-none">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left Navigation Indicator */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-[#080d19]/90 border border-cyan-900/80 px-3 py-1.5 text-xs text-cyan-400 font-bold flex items-center gap-2 pointer-events-auto">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>CHAKRAVYUH TACTICAL DEFENSE MAP // LIVE TELEMETRY</span>
        </div>
      </div>

      {/* Bottom Left Telemetry Overlay Pills - real measured values, not decorative */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 pointer-events-auto">
        <div className="bg-[#080d19]/90 border border-cyan-900/80 px-3 py-1.5 rounded text-[10px] flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${latencyMs !== null ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-slate-400 font-bold">SENSE API LATENCY</span>
          <span className="text-cyan-300 font-mono font-bold">{latencyMs !== null ? `${latencyMs}ms` : '—'}</span>
        </div>

        <div className="bg-[#080d19]/90 border border-cyan-900/80 px-3 py-1.5 rounded text-[10px] flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isAISLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          <span className="text-slate-400 font-bold">AIS FEED</span>
          <span className={`font-mono font-bold ${isAISLive ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isAISLive ? 'LIVE' : 'SIMULATED'}
          </span>
        </div>
      </div>

      {/* Dynamic Top Right HUD Overlay Stack (Matches Image 1) */}
      <div className="absolute top-3 right-3 z-10 w-72 space-y-3 pointer-events-auto">
        {/* Domestic Reserves Box */}
        <div className="bg-[#080d19]/90 border border-cyan-900/80 p-3.5 rounded text-xs space-y-2 shadow-xl">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider flex items-center justify-between">
            <span>DOMESTIC RESERVES</span>
            <span className="text-[9px] text-slate-500">[DATA:SECURE]</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black text-white">{Math.round(domesticReservePct)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(10, domesticReservePct))}%` }}
            ></div>
          </div>
        </div>

        {/* Transit Risk Index semi-circular radial meter */}
        <div className="bg-[#080d19]/90 border border-cyan-900/80 p-3.5 rounded text-xs space-y-2 shadow-xl">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider">TRANSIT RISK INDEX</div>
          <div className="flex flex-col items-center justify-center pt-1">
            <div className="text-2xl font-black text-red-400">{transitRiskScore.toFixed(1)}</div>
            <div className="text-[10px] text-red-500 font-bold tracking-widest uppercase mt-0.5">CRITICAL INDEX</div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div 
                className="bg-gradient-to-r from-amber-500 via-red-500 to-red-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, transitRiskScore * 10)}%` }}
              ></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 text-center leading-tight">
              Transit Risk Index in Hormuz exceeds threshold of 7.5. Emergency protocol CHAKRA-01 active.
            </p>
          </div>
        </div>

        {/* Dynamic Refinery Status Box */}
        <div className="bg-[#080d19]/90 border border-cyan-900/80 p-3.5 rounded text-xs space-y-2 shadow-xl">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider border-b border-slate-800 pb-1">
            REFINERY STATUS
          </div>
          {activeRefineries.map((rf, i) => (
            <div key={i} className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold">■ {rf.name}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                rf.status === 'OPTIMAL'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : rf.status === 'STANDBY'
                    ? 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                    : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
                {rf.status}
              </span>
            </div>
          ))}
        </div>

        {/* Site reference imagery - explicitly NOT claimed as a live feed (Reality Ledger discipline) */}
        <div className="bg-[#080d19]/90 border border-cyan-900/80 rounded overflow-hidden shadow-xl p-1">
          <div className="relative h-24 bg-slate-950 rounded flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80"
              alt="Jamnagar refinery complex - reference imagery"
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-cyan-950/20"></div>
            <div className="absolute top-1 left-2 text-[9px] text-slate-300 font-bold bg-black/60 px-1.5 py-0.5 rounded">
              JAMNAGAR // REFERENCE IMAGE (NOT LIVE)
            </div>
          </div>
        </div>
      </div>

      {/* Selected Item Info Modal Overlay */}
      {selectedItem && (
        <div className="absolute top-3 left-1/3 z-20 w-80 bg-[#080d19]/95 p-4 border border-cyan-500/60 text-xs text-slate-200 shadow-2xl rounded">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-cyan-400 uppercase">{selectedItem.type} DATA</span>
            <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
          <pre className="text-[10px] text-cyan-200 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(selectedItem.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
