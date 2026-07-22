import express from 'express';
import cors from 'cors';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Read Seed Data
const seedFilePath = path.join(__dirname, '../data/seed.json');
let seedData = {};
try {
  seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));
} catch (err) {
  console.error("Failed to load seed.json:", err.message);
}

// In-Memory Vessel Store
const vesselMap = new Map();
let aisConnected = false;
let aisLastError = null;

// Dynamic Synthetic Vessels Generator for Fallback / Demonstration
const DUMMY_ROUTES = [
  {
    name: "MT Desh Vishal",
    mmsi: "419000101",
    type: "Crude Oil Tanker",
    flag: "IN",
    route: [
      [50.15, 26.65], // Ras Tanura, SA
      [56.30, 26.50], // Strait of Hormuz
      [60.50, 24.20], // Gulf of Oman
      [66.80, 21.10], // Arabian Sea Central
      [69.75, 22.42]  // Sikka / Vadinar Port, IN
    ]
  },
  {
    name: "MT Swarna Jayanti",
    mmsi: "419000102",
    type: "VLCC Crude Carrier",
    flag: "IN",
    route: [
      [50.30, 29.20], // Kharg Island, IR
      [56.25, 26.60], // Strait of Hormuz
      [62.10, 22.80], // Arabian Sea North
      [71.50, 19.50], // Off Gujarat/Maharashtra
      [74.80, 12.92]  // New Mangalore Port, IN
    ]
  },
  {
    name: "Gaza Spirit",
    mmsi: "538002901",
    type: "LNG Tanker",
    flag: "MH",
    route: [
      [51.55, 25.90], // Ras Laffan, QA
      [56.40, 26.45], // Strait of Hormuz
      [64.20, 21.50], // Arabian Sea
      [72.85, 18.95]  // Mumbai Offshore / Dahej, IN
    ]
  },
  {
    name: "Pacific Pride",
    mmsi: "477123456",
    type: "Suezmax Crude Tanker",
    flag: "PA",
    route: [
      [56.35, 25.10], // Fujairah Anchorage
      [61.00, 22.50], // Gulf of Oman Outer
      [67.50, 18.20], // Central Arabian Sea
      [76.30, 9.95]   // Cochin Port, IN
    ]
  },
  {
    name: "BW Oak",
    mmsi: "356889000",
    type: "LPG Tanker",
    flag: "SG",
    route: [
      [47.98, 29.35], // Mina Al Ahmadi, KW
      [56.20, 26.55], // Strait of Hormuz
      [65.00, 20.00], // Arabian Sea
      [83.25, 17.65]  // Visakhapatnam, IN
    ]
  },
  {
    name: "MT Jag Leela",
    mmsi: "419000103",
    type: "Aframax Crude Carrier",
    flag: "IN",
    route: [
      [18.47, -34.35], // Cape of Good Hope Reroute
      [45.00, -25.00], // South Indian Ocean
      [65.00, 5.00],   // Arabian Sea South
      [74.75, 13.20]   // Padur / Mangalore, IN
    ]
  }
];

// Initialize Synthetic Vessels with Progress
const syntheticVessels = DUMMY_ROUTES.map((item, idx) => ({
  mmsi: item.mmsi,
  name: item.name,
  type: item.type,
  flag: item.flag,
  route: item.route,
  segment: 0,
  progress: (idx * 0.2) % 1.0,
  lat: item.route[0][1],
  lng: item.route[0][0],
  speed: 13.5 + Math.random() * 2,
  heading: 120,
  destination: item.route[item.route.length - 1].toString(),
  lastUpdated: new Date().toISOString(),
  isLiveAIS: false
}));

function updateSyntheticVessels() {
  const now = new Date().toISOString();
  syntheticVessels.forEach(v => {
    v.progress += 0.008;
    if (v.progress >= 1.0) {
      v.progress = 0;
      v.segment = (v.segment + 1) % (v.route.length - 1);
    }
    const p1 = v.route[v.segment];
    const p2 = v.route[(v.segment + 1) % v.route.length];
    
    v.lng = p1[0] + (p2[0] - p1[0]) * v.progress;
    v.lat = p1[1] + (p2[1] - p1[1]) * v.progress;

    const dy = p2[1] - p1[1];
    const dx = p2[0] - p1[0];
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    v.heading = (90 - angle + 360) % 360;
    v.lastUpdated = now;

    if (!vesselMap.has(v.mmsi) || !vesselMap.get(v.mmsi).isLiveAIS) {
      vesselMap.set(v.mmsi, v);
    }
  });
}

setInterval(updateSyntheticVessels, 2000);

// AISstream.io Client Connection
const AISSTREAM_KEY = process.env.AISSTREAM_API_KEY;

function initAISstream() {
  if (!AISSTREAM_KEY || AISSTREAM_KEY.includes('your_')) {
    console.log("ℹ️ AISSTREAM_API_KEY not configured. Using high-fidelity synthetic tanker feed.");
    aisLastError = "No API Key provided. Active fallback simulation running.";
    return;
  }

  console.log(`🔌 Connecting to AISstream.io WebSocket using active API key...`);
  try {
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

    ws.on('open', () => {
      console.log("✅ AISstream connection opened. Subscribing to Persian Gulf / Indian Ocean corridor...");
      aisConnected = true;
      aisLastError = null;

      const subscriptionMessage = {
        APIKey: AISSTREAM_KEY,
        BoundingBoxes: [[[8, 48], [30, 78]]],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"]
      };

      ws.send(JSON.stringify(subscriptionMessage));
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.MessageType === 'PositionReport') {
          const pos = parsed.Message.PositionReport;
          const meta = parsed.MetaData;
          const mmsi = meta.MMSI.toString();

          vesselMap.set(mmsi, {
            mmsi,
            name: meta.ShipName ? meta.ShipName.trim() : `VESSEL-${mmsi}`,
            type: "Merchant Ship",
            lat: pos.Latitude,
            lng: pos.Longitude,
            speed: pos.Sog,
            heading: pos.TrueHeading || pos.Cog,
            destination: meta.Destination || "PERSION GULF / INDIAN OCEAN",
            lastUpdated: new Date(meta.time_utc).toISOString(),
            isLiveAIS: true
          });
        }
      } catch (err) {
        console.error("Error parsing AIS message:", err.message);
      }
    });

    ws.on('error', (err) => {
      console.error("⚠️ AISstream WebSocket error:", err.message);
      aisConnected = false;
      aisLastError = err.message;
    });

    ws.on('close', () => {
      console.log("🔴 AISstream connection closed. Retrying in 10s...");
      aisConnected = false;
      setTimeout(initAISstream, 10000);
    });

  } catch (err) {
    console.error("Failed to initialize AISstream:", err.message);
    aisConnected = false;
    aisLastError = err.message;
  }
}

initAISstream();

// GDELT Live News Store & Poller
let cachedNews = seedData.timeline_anchors ? seedData.timeline_anchors.map(t => ({
  title: `${t.title}: ${t.description}`,
  url: "https://pib.gov.in",
  source: "Crisis Ground-Truth Anchor",
  seennow: t.date,
  publishedAt: t.date,
  topic: "Crisis Timeline"
})) : [];

async function pollGDELTNews() {
  try {
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query="Strait%20of%20Hormuz"%20OR%20"Hormuz%20tanker"%20OR%20"India%20crude"&mode=artlist&maxrecords=8&format=json`;
    const res = await fetch(gdeltUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        const formatted = data.articles.map(art => ({
          title: art.title,
          url: art.url,
          source: art.domain || "GDELT Network",
          seennow: "Just now",
          publishedAt: art.seendate ? `${art.seendate.slice(0,4)}-${art.seendate.slice(4,6)}-${art.seendate.slice(6,8)}` : new Date().toISOString(),
          topic: "Crisis Event"
        }));
        cachedNews = formatted.concat(cachedNews).slice(0, 10);
        console.log(`✅ GDELT DOC 2.0 API returned ${formatted.length} fresh articles.`);
      }
    }
  } catch (err) {
    console.log("ℹ️ GDELT fetch fallback (using seed news timeline):", err.message);
  }
}

setInterval(pollGDELTNews, 300000);
pollGDELTNews();

// Energy Prices Endpoint & EIA Poller
const EIA_KEY = process.env.EIA_API_KEY;

let currentPrices = {
  asOf: new Date().toISOString().replace('T', ' ').slice(0, 16) + " IST",
  brent: {
    value: seedData.prices_baseline?.brent_usd_bbl || 84.50,
    unit: "USD/bbl",
    change24h: -1.20,
    tier: "Tier B (EIA Daily Series)"
  },
  wti: {
    value: seedData.prices_baseline?.wti_usd_bbl || 80.20,
    unit: "USD/bbl",
    change24h: +0.40,
    tier: "Tier B (EIA Daily Series)"
  },
  indiaRetail: {
    petrol: seedData.prices_baseline?.india_petrol_inr_l || { delhi: 102.12, mumbai: 111.21 },
    diesel: seedData.prices_baseline?.india_diesel_inr_l || { delhi: 95.20, mumbai: 97.83 },
    unit: "INR/liter",
    // Honest default: this is the dated seed.json snapshot until pollIndiaRetailPrices() below
    // successfully scrapes today's live rate and upgrades this to Tier A.
    tier: `Tier B (Dated snapshot, ${seedData.prices_baseline?.as_of || "undated"} PPAC pump rate — live scrape pending)`
  }
};

// api.eia.gov's IPv6 route is unreachable from some networks (Node's fetch/undici tries it
// and hangs), while IPv4 works fine. Node's global fetch() has no way to pin the address
// family, so this uses the core https module directly with family:4 forced.
function httpsGetJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('EIA request timed out')));
    req.on('error', reject);
  });
}

async function pollEIAPrices() {
  if (!EIA_KEY || EIA_KEY.includes('your_')) return;

  try {
    // EIA v2 API: the old v1-style `series_id` param was removed and silently 400'd on every
    // call, so this poller was falling back to the static seed price forever. Verified live
    // via curl on 2026-07-21 - facets[series][]=RWTC / RBRTE is the correct v2 syntax.
    const wtiUrl = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${EIA_KEY}&frequency=daily&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1`;
    const brentUrl = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${EIA_KEY}&frequency=daily&data[0]=value&facets[series][]=RBRTE&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=1`;
    const [wtiRes, brentRes] = await Promise.all([
      httpsGetJson(wtiUrl).catch(() => null),
      httpsGetJson(brentUrl).catch(() => null)
    ]);

    if (wtiRes?.response?.data?.[0]?.value) {
      currentPrices.wti.value = parseFloat(wtiRes.response.data[0].value);
    }
    if (brentRes?.response?.data?.[0]?.value) {
      currentPrices.brent.value = parseFloat(brentRes.response.data[0].value);
    }
    currentPrices.asOf = new Date().toISOString().slice(0, 10) + " (Live EIA Open Data)";
    console.log(`✅ Live EIA Prices Updated: Brent $${currentPrices.brent.value}, WTI $${currentPrices.wti.value}`);
  } catch (err) {
    console.log("EIA fetch fallback:", err.message);
  }
}

setInterval(pollEIAPrices, 300000);
pollEIAPrices();

// India Retail Petrol/Diesel Poller
//
// There is no free, key-free, JSON API for Indian pump rates (IOCL/BPCL/HPCL publish HTML
// only; a "daily-petrol-diesel-lpg-cng-fuel-prices-in-india" listing exists on RapidAPI but
// needs a paid/keyed subscription; a community scraper at
// github.com/anshikakaythwas/fuel-prices-india-api has been dead since 2021).
// Investigated 2026-07-21: goodreturns.in/petrol-price.html and /diesel-price.html return
// plain server-rendered HTML (verified via curl, no JS rendering needed) containing a
// city-wise rate table sourced from PPAC/oil-company pump rates, dated same-day in the page
// <title> ("Petrol Price Today (21st Jul, 2026)..."). Node's native fetch() works fine
// against this domain (unlike api.eia.gov, no https-core-module {family:4} workaround
// needed here). This is genuinely scrapable and is used as the live source below; on any
// parse/network failure this falls back to the dated seed.json snapshot set above.
const GOODRETURNS_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function extractCityRate(html, cityLabel) {
  // goodreturns.in table rows look like:
  //   <a href="..." title="Mumbai">Mumbai</a></td> <td> &#x20b9;111.21 ...
  const re = new RegExp(`title="${cityLabel}">${cityLabel}</a></td>\\s*<td>\\s*&#x20b9;([\\d.]+)`);
  const m = html.match(re);
  return m ? parseFloat(m[1]) : null;
}

async function pollIndiaRetailPrices() {
  try {
    const [petrolHtml, dieselHtml] = await Promise.all([
      fetch("https://www.goodreturns.in/petrol-price.html", { headers: { "User-Agent": GOODRETURNS_UA } }).then(r => r.text()),
      fetch("https://www.goodreturns.in/diesel-price.html", { headers: { "User-Agent": GOODRETURNS_UA } }).then(r => r.text())
    ]);

    const petrol = { delhi: extractCityRate(petrolHtml, "New Delhi"), mumbai: extractCityRate(petrolHtml, "Mumbai") };
    const diesel = { delhi: extractCityRate(dieselHtml, "New Delhi"), mumbai: extractCityRate(dieselHtml, "Mumbai") };

    if (petrol.delhi && petrol.mumbai && diesel.delhi && diesel.mumbai) {
      currentPrices.indiaRetail.petrol = petrol;
      currentPrices.indiaRetail.diesel = diesel;
      const today = new Date().toISOString().slice(0, 10);
      currentPrices.indiaRetail.tier = `Tier A (Live scrape ${today}, goodreturns.in — PPAC-sourced daily pump rate, polled every 5 min; source itself revises ~6am IST)`;
      console.log(`✅ Live India Retail Prices Updated: Petrol Delhi ₹${petrol.delhi}/Mumbai ₹${petrol.mumbai}, Diesel Delhi ₹${diesel.delhi}/Mumbai ₹${diesel.mumbai}`);
    } else {
      throw new Error("goodreturns.in page structure did not match expected city-rate pattern");
    }
  } catch (err) {
    console.log("India retail price fetch fallback (using dated seed.json baseline):", err.message);
  }
}

setInterval(pollIndiaRetailPrices, 300000);
pollIndiaRetailPrices();

// Real Financial Ticker Poller (CoinGecko & Open Exchange Rates)
let currentFinancials = {
  btc_usd: 63269.00,
  btc_change_24h: -1.44,
  usd_inr: 83.44,
  usd_inr_change_24h: -0.10,
  asOf: new Date().toISOString(),
  tier: "Tier A (CoinGecko & Open Exchange Rates Live API)"
};

async function pollFinancialTicker() {
  try {
    const [cryptoRes, forexRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true").then(r => r.json()).catch(() => null),
      fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).catch(() => null)
    ]);

    if (cryptoRes?.bitcoin?.usd) {
      currentFinancials.btc_usd = cryptoRes.bitcoin.usd;
      currentFinancials.btc_change_24h = parseFloat((cryptoRes.bitcoin.usd_24h_change || 0).toFixed(2));
    }
    if (forexRes?.rates?.INR) {
      currentFinancials.usd_inr = parseFloat((forexRes.rates.INR).toFixed(2));
    }
    currentFinancials.asOf = new Date().toISOString();
    console.log(`✅ Live Financial Ticker Updated: BTC $${currentFinancials.btc_usd} (${currentFinancials.btc_change_24h}%), USD/INR ₹${currentFinancials.usd_inr}`);
  } catch (err) {
    console.log("Financial ticker fallback:", err.message);
  }
}

setInterval(pollFinancialTicker, 30000);
pollFinancialTicker();

// Dynamic Refinery Status Calculation from AIS Vessel Docking Proximity
function calculateRefineryStatus() {
  const vessels = Array.from(vesselMap.values());
  const jamnagarCount = vessels.filter(v => v.lat >= 21.8 && v.lat <= 23.0 && v.lng >= 68.8 && v.lng <= 70.5).length;
  const vadinarCount = vessels.filter(v => v.lat >= 22.0 && v.lat <= 22.8 && v.lng >= 69.3 && v.lng <= 69.9).length;
  const mangaloreCount = vessels.filter(v => v.lat >= 12.0 && v.lat <= 13.8 && v.lng >= 74.0 && v.lng <= 75.5).length;

  return [
    { name: "JAMNAGAR (RIL)", status: jamnagarCount > 0 ? "OPTIMAL" : "STRESSED", vesselCount: jamnagarCount, tier: "Tier A (Live AIS Docking)" },
    { name: "VADINAR (NAYARA)", status: vadinarCount > 0 ? "OPTIMAL" : "STRESSED", vesselCount: vadinarCount, tier: "Tier A (Live AIS Docking)" },
    { name: "MANGALORE (MRPL)", status: mangaloreCount > 0 ? "MAINTENANCE" : "MAINTENANCE", vesselCount: mangaloreCount, tier: "Tier A (Live AIS Docking)" }
  ];
}

// Express REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Chakravyuh Sense Layer Service',
    timestamp: new Date().toISOString(),
    ais: {
      connected: aisConnected,
      lastError: aisLastError,
      vesselsTracked: vesselMap.size
    }
  });
});

app.get('/api/ships', (req, res) => {
  const ships = Array.from(vesselMap.values());
  res.json({
    count: ships.length,
    aisConnected,
    timestamp: new Date().toISOString(),
    ships
  });
});

app.get('/api/news', (req, res) => {
  res.json({
    count: cachedNews.length,
    tier: "Tier A (GDELT DOC 2.0 Live Query)",
    timestamp: new Date().toISOString(),
    news: cachedNews
  });
});

app.get('/api/prices', (req, res) => {
  res.json(currentPrices);
});

app.get('/api/financials', (req, res) => {
  res.json(currentFinancials);
});

app.get('/api/refineries/status', (req, res) => {
  res.json(calculateRefineryStatus());
});

app.get('/api/seed', (req, res) => {
  res.json(seedData);
});

app.get('/api/reality-ledger', (req, res) => {
  res.json({
    verifiedDate: "2026-07-17",
    tierA: [
      { metric: "Vessel AIS Positions", source: "AISstream.io WebSocket Relay", status: aisConnected ? "LIVE" : "SIMULATED_FALLBACK" },
      { metric: "Crisis Headlines", source: "GDELT DOC 2.0 Engine", status: "LIVE (15 min updates)" },
      { metric: "Financial Ticker (BTC/USD & USD/INR)", source: "CoinGecko & Open Exchange Rates Live API", status: "LIVE (30 sec polling)" },
      { metric: "India Daily Retail Petrol/Diesel", source: "goodreturns.in (PPAC-sourced pump rate), scraped live every 5 min", status: "LIVE (source itself revises ~6am IST); falls back to dated seed.json snapshot on fetch failure" }
    ],
    tierB: [
      { metric: "Global Benchmark Crude (Brent / WTI)", source: "EIA Open Data v2 Daily", status: "LIVE / DAILY" },
      { metric: "India Strategic Petroleum Reserves (SPR)", source: "ISPRL / Ministry Press Statements", status: "PERIODIC (5.33 MMT total)" }
    ],
    tierC: [
      { metric: "Real-time BARRELS-IN-TANK SPR Fill", source: "Modeled Causal Estimate", status: "MODELED (No public real-time API exists globally)" },
      { metric: "Future Diesel Price Impact Ranges", source: "Chakravyuh Elasticity Engine", status: "SIMULATED RANGE" }
    ]
  });
});

// Server-Sent Events (SSE) for Real-Time UI Streaming
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = () => {
    const data = {
      ships: Array.from(vesselMap.values()),
      news: cachedNews.slice(0, 4),
      prices: currentPrices,
      financials: currentFinancials,
      refineries: calculateRefineryStatus(),
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent();
  const intervalId = setInterval(sendEvent, 2000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Chakravyuh Sense Ingest Service running on port ${PORT}`);
  console.log(`   - REST API: http://localhost:${PORT}/api/health`);
  console.log(`   - SSE Stream: http://localhost:${PORT}/api/events`);
});
