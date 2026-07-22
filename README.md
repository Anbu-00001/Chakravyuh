# 🛡️ Chakravyuh — AI War-Room for Energy Supply-Chain Resilience

**A causal simulation engine + multi-agent war-room for a crisis that is happening right now.**

<p>
  <img alt="ET AI Hackathon 2.0" src="https://img.shields.io/badge/ET%20AI%20Hackathon%202.0-Problem%20Statement%202-red?style=for-the-badge">
  <img alt="Status" src="https://img.shields.io/badge/Crisis%20Modeled-LIVE%20%26%20UNRESOLVED-critical?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge">
</p>

<p>
  <img alt="React" src="https://img.shields.io/badge/React_19-Vite-149eca?style=flat-square&logo=react&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-NetworkX-009688?style=flat-square&logo=fastapi&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white">
  <img alt="deck.gl" src="https://img.shields.io/badge/deck.gl-MapLibre_GL-6f42c1?style=flat-square">
  <img alt="LLM" src="https://img.shields.io/badge/Multi--LLM-Groq_%7C_Gemini_%7C_NVIDIA-orange?style=flat-square">
</p>

---

## 🔥 This is not a hypothetical

Since **28 February 2026**, the US and Israel have been at war with Iran. The Strait of Hormuz — the channel **~20% of the world's crude oil** physically has to pass through — has been mined, boarded, and closed to commercial traffic by the IRGC. As of this week, at least **9 tankers have been attacked since July 6**, and US airstrikes on Iran are in their **10th consecutive night**.

Most "energy security" dashboards you'll see today are static risk monitors — a red/yellow/green light with no model behind it. **Chakravyuh asks a different question**: *if Hormuz transit drops another 20%, which refinery runs dry first, how many days of buffer does India actually have left, and what's the fastest real intervention to buy more time?* — then answers it with an actual directed-graph simulation, not a guess.

---

## 🧭 Table of Contents

- [Architecture](#-architecture)
- [How a shock actually propagates](#-how-a-shock-propagates-through-the-graph)
- [The multi-agent AI playbook loop](#-the-multi-agent-ai-playbook-loop)
- [The Reality Ledger — our answer to "is this data real?"](#-the-reality-ledger--our-answer-to-is-this-data-real)
- [See it running](#-see-it-running)
- [Tech stack](#-tech-stack)
- [Quick start](#-quick-start)
- [Project structure](#-project-structure)
- [Why this wins](#-why-this-wins)

---

## 🏗️ Architecture

Three independent services, each doing one job well, feeding a single war-room UI.

```mermaid
flowchart TB
    subgraph EXT["🌐 REAL-WORLD DATA SOURCES"]
        direction LR
        EIA["EIA Open Data v2\nBrent · WTI spot prices"]
        AIS["AISstream.io\nLive vessel WebSocket"]
        GDELT["GDELT DOC 2.0\nCrisis news feed"]
        FX["CoinGecko · open.er-api.com\nBTC/USD · USD/INR"]
        PPAC["goodreturns.in\nIndia retail pump rates"]
    end

    subgraph SENSE["🔵 LAYER 1 · SENSE — ingest/ · Node.js + Express · :5000"]
        INGEST["Polling relay\n5-min / 30-sec cycles\nhonest Tier A/B fallback"]
    end

    subgraph SIMULATE["🟣 LAYER 2 · SIMULATE — simulate/ · FastAPI + NetworkX · :8000"]
        GRAPH["Causal Directed Graph\n24 nodes · sources→ports→refineries→SPR→demand"]
        MC["Monte Carlo Engine\nP10 / P50 / P90, 100 runs"]
        RT["Red-Team Escalation Agent\nMEDIUM / HIGH / CRITICAL"]
    end

    subgraph STRATEGIZE["🩷 LAYER 3 · STRATEGIZE — strategize/ · Multi-Agent Loop"]
        PLANNER["Planner Agent"]
        CRITIC["Multi-Turn Critic"]
        LLM["Groq → Gemini → NVIDIA\nfallback dispatcher"]
    end

    subgraph UI["🔷 WAR-ROOM UI — web/ · React 19 + Vite + deck.gl · :5173"]
        MAP["Tactical Map"]
        SIM["Causal Simulator"]
        WAR["Adversarial Wargame"]
        SCADA["Refinery SCADA & Rationing"]
        LEDGER["Reality Ledger"]
    end

    EIA --> INGEST
    AIS --> INGEST
    GDELT --> INGEST
    FX --> INGEST
    PPAC --> INGEST

    INGEST -->|"REST · /api/*"| UI
    SIMULATE -->|"REST · /api/simulate/*"| UI
    PLANNER --> CRITIC --> LLM
    STRATEGIZE -->|"REST · /api/strategize"| UI
    UI -.->|"user drives severity, mitigations,\nred-team intensity"| SIMULATE
    UI -.-> STRATEGIZE

    classDef sense fill:#dbeafe,stroke:#1e3a8a,color:#1e3a8a,stroke-width:1.5px
    classDef simulate fill:#ede9fe,stroke:#5b21b6,color:#5b21b6,stroke-width:1.5px
    classDef strategize fill:#fce7f3,stroke:#9d174d,color:#9d174d,stroke-width:1.5px
    classDef ui fill:#cffafe,stroke:#155e75,color:#155e75,stroke-width:1.5px
    classDef ext fill:#f1f5f9,stroke:#475569,color:#334155,stroke-width:1px

    class INGEST sense
    class GRAPH,MC,RT simulate
    class PLANNER,CRITIC,LLM strategize
    class MAP,SIM,WAR,SCADA,LEDGER ui
    class EIA,AIS,GDELT,FX,PPAC ext
```

---

## ⚡ How a shock propagates through the graph

This is the actual topology `simulate/graph_engine.py` and `simulate/regional_graph.py` model — a real NetworkX `DiGraph`, not a static diagram. When you drag the severity slider, this is the path the shock physically walks, node by node, before it ever reaches a chart.

```mermaid
flowchart LR
    subgraph GULF["Gulf Crude Sources"]
        RT2["Ras Tanura 🇸🇦"]
        KI["Kharg Island 🇮🇷"]
        MA["Mina Al Ahmadi 🇰🇼"]
        RL["Ras Laffan 🇶🇦"]
    end

    HORMUZ{{"⚠️ STRAIT OF HORMUZ\nshock injected here\n65% severity = current"}}
    CAPE(["Cape of Good Hope\n+10-14 day reroute"])

    subgraph INDIA["Indian Ports → Refineries"]
        PORT["Vadinar / Sikka Port"]
        REF["Jamnagar · Vadinar · Mangaluru\nKochi · Mumbai · Paradip · Vizag"]
    end

    SPR[("Strategic Reserves\nVSKP · Mangaluru · Padur")]
    DEMAND["National Demand\n~5.0M bpd"]
    PRICE["🛢️ Retail Pump Price\nDelhi / Mumbai"]

    RT2 & KI & MA & RL --> HORMUZ
    HORMUZ -->|"blocked capacity"| PORT
    HORMUZ -.->|"reroute option\n+12 days"| CAPE
    CAPE -.-> PORT
    PORT --> REF
    SPR -->|"drawdown"| REF
    REF --> DEMAND --> PRICE

    MIT1["🛟 SPR Release"] -.->|mitigation| SPR
    MIT2["🛟 Cape Reroute"] -.->|mitigation| CAPE
    MIT3["🛟 Demand Quotas"] -.->|mitigation| DEMAND

    classDef shock fill:#fee2e2,stroke:#991b1b,color:#7f1d1d,stroke-width:2px
    classDef reroute fill:#d1fae5,stroke:#065f46,color:#065f46,stroke-width:1.5px
    classDef reserve fill:#fef3c7,stroke:#92400e,color:#92400e,stroke-width:1.5px
    classDef mit fill:#e0f2fe,stroke:#0369a1,color:#0369a1,stroke-width:1px,stroke-dasharray: 3 3

    class HORMUZ shock
    class CAPE reroute
    class SPR reserve
    class MIT1,MIT2,MIT3 mit
```

Every mitigation shown above is **wired to a real backend recomputation** (`POST /api/simulate` with `mitigation_applied`) — toggling one in the UI doesn't look up a canned number, it re-runs the graph.

---

## 🤖 The multi-agent AI playbook loop

Clicking **"Generate AI Playbooks"** doesn't call one model once — it runs a real Planner → Simulator-as-tool → Critic loop, with automatic multi-provider fallback so a single rate-limited key never kills the demo.

```mermaid
sequenceDiagram
    actor U as Judge or User
    participant UI as War-Room UI
    participant API as FastAPI (/api/strategize)
    participant P as Planner Agent
    participant S as Causal Graph<br/>(Simulator-as-Tool)
    participant C as Multi-Turn Critic
    participant L as LLM Dispatcher

    U->>UI: Click "Generate AI Playbooks"
    UI->>API: POST /api/strategize {severity, chokepoint}
    API->>P: propose 3 candidate mitigations
    par for each candidate
        P->>S: simulate_shock(mitigation = candidate)
        S-->>P: real day-30 buffer + trajectory
    end
    P->>C: candidates + simulated outcomes
    loop multi-turn refinement
        C->>L: critique via Groq (ultra-low latency)
        alt Groq unavailable / rate-limited
            L->>L: fall back → Gemini
        else Gemini unavailable
            L->>L: fall back → NVIDIA Cloud API
        end
        L-->>C: refined ranked rationale
    end
    C-->>API: ranked, cited playbooks
    API-->>UI: playbooks[] with restored_cover_days
    UI-->>U: real numbers replace the "EXAMPLE" placeholder cards
```

---

## 📋 The Reality Ledger — our answer to "is this data real?"

Every number on screen is put through the same honesty test before it's allowed to render. This is the single design principle the rest of the project is built around — a judge should never have to wonder whether a metric is live, dated, or invented.

```mermaid
flowchart TD
    START(["Metric about to render"]) --> Q1{"Is a live API/feed\nreachable right now?"}
    Q1 -->|Yes| A["🟢 TIER A — LIVE\nlabeled with source + timestamp"]
    Q1 -->|No| Q2{"Does a real, dated\nsource exist?"}
    Q2 -->|Yes| B["🟡 TIER B — PERIODIC\nlabeled with the source's own date"]
    Q2 -->|No| Q3{"Is it a necessary\nmodel assumption?"}
    Q3 -->|Yes| C["⚪ TIER C — MODELED\nexplicit 'modeled estimate' badge +\nsource_attribution in the API response"]
    Q3 -->|No| D["🚫 Not shown\nfabricated fallback is never an option"]

    classDef tierA fill:#d1fae5,stroke:#065f46,color:#065f46,stroke-width:1.5px
    classDef tierB fill:#fef3c7,stroke:#92400e,color:#92400e,stroke-width:1.5px
    classDef tierC fill:#e2e8f0,stroke:#334155,color:#334155,stroke-width:1.5px
    classDef no fill:#fee2e2,stroke:#991b1b,color:#7f1d1d,stroke-width:1.5px

    class A tierA
    class B tierB
    class C tierC
    class D no
```

| Metric | Source | Tier |
|---|---|---|
| Global crude spot (Brent / WTI) | EIA Open Data v2, polled every 5 min | 🟡 Tier B — daily benchmark series |
| India retail petrol/diesel (Delhi, Mumbai) | Live scrape, goodreturns.in, polled every 5 min | 🟢 Tier A when reachable → honestly falls back to a dated snapshot otherwise |
| BTC/USD, USD/INR | CoinGecko · open.er-api.com | 🟢 Tier A — 30-sec polling |
| Vessel positions | AISstream.io live WebSocket | 🟢 Tier A when the socket connects → clearly badged **SIMULATED** when it doesn't (never faked as live) |
| Crisis timeline (Hormuz events) | Wikipedia · CNBC · Washington Post · NPR, dated | 🟡 Tier B — sourced, dated, cited inline in the Reality Ledger modal |
| Causal-graph stress %, Monte Carlo bands, sectoral GDP-loss coefficients | This project's NetworkX/Monte Carlo model | ⚪ Tier C — every one carries a `source_attribution` field disclosing exactly what's modeled vs. measured |

---

## 🖥️ See it running

**Tactical Map** — live crisis SITREP, vessel corridor, refinery status, and the Tier A/B pump-price ticker, all in one view:

![Chakravyuh Tactical Map](docs/screenshots/tactical-map.png)

**Causal Simulator** — drag the severity slider, toggle real mitigations, watch the 30-day depletion trajectory recompute live:

![Chakravyuh Causal Simulator](docs/screenshots/causal-simulator.png)

---

## 🧰 Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, deck.gl (`TripsLayer`), MapLibre GL, Recharts, lucide-react |
| Sense (ingest) | Node.js, Express, native `ws` WebSocket client, Node core `https` |
| Simulate | Python, FastAPI, NetworkX (directed graph), NumPy (Monte Carlo), Pydantic |
| Strategize | Multi-agent Planner→Critic loop, `google-generativeai` + raw HTTP dispatch to Groq / NVIDIA Cloud API |
| Data | PPAC Ready Reckoner (real parsed PDF via `pdftotext`), verified SPR/refinery figures, dated crisis timeline |

---

## 🚀 Quick start

Full step-by-step setup (env files, exact commands, troubleshooting) lives in **[`DocumentForTeamate.md`](DocumentForTeamate.md)**. Short version:

```bash
git clone https://github.com/Anbu-00001/Chakravyuh.git
cd Chakravyuh
# place .env (root) and web/.env — see DocumentForTeamate.md

cd ingest && npm install && cd ..
cd web && npm install && cd ..
pip install -r simulate/requirements.txt && pip install google-generativeai

# 3 terminals, from repo root:
cd ingest && node index.js                                   # :5000
set -a; source .env; set +a; uvicorn simulate.main:app --port 8000 --reload   # :8000
cd web && npm run dev                                         # :5173
```

Open `http://localhost:5173`.

---

## 📁 Project structure

```
Chakravyuh/
├── ingest/          # Layer 1 · SENSE — Node/Express telemetry relay
├── simulate/         # Layer 2 · SIMULATE — FastAPI + NetworkX causal engine
├── strategize/        # Layer 3 · STRATEGIZE — multi-agent LLM playbook loop
├── web/            # War-Room UI — React 19 + Vite + deck.gl
├── data/           # seed.json (verified baselines) + real source PDFs
├── scripts/          # Data-provenance scripts (e.g. real PPAC PDF → seed.json)
└── DocumentForTeamate.md  # Full setup + demo walkthrough
```

---

## 🏆 Why this wins

- **It's not modeling a hypothetical.** The crisis is real, dated, sourced, and ongoing as of this week.
- **The simulation is a real graph, not a slider hooked to a formula.** 24-node NetworkX DAG, Monte Carlo P10/P50/P90, differentiated per-refinery stress based on each site's actual modeled Hormuz-dependency exposure.
- **Nothing on screen lies about what it is.** Every metric carries a tier — live, dated, or modeled — enforced by the Reality Ledger, down to individual coefficients in the simulation engines.
- **The AI layer is a real agent loop with real fallback**, not a single prompt-and-pray call to one API key.
