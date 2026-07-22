# Chakravyuh — Setup & Demo Guide for Teammates

**Read this top to bottom before touching anything.** This project has 3 separate services that all have to run at once, plus two secret-key files that don't come from GitHub. If you skip a step, the most common symptom is "the map loads but numbers look wrong/empty" — 90% of the time that's a missing env var or a service that isn't running, not a real bug. This doc has a full troubleshooting table at the bottom for exactly that.

**If you have Claude Code (or another AI coding assistant) helping you set this up**: paste this entire file to it as context, or just point it at this file — it's written to be followed literally, step by step, with exact commands and exact expected output. See the **"For your AI assistant"** box near the end for direct diagnostic pointers.

---

## 0. What this project is (30 seconds)

**Chakravyuh** is an AI war-room dashboard built for the **Economic Times AI Hackathon 2.0**. It simulates how a real, ongoing crisis — the 2026 Strait of Hormuz shipping blockade — cascades through India's (and Japan's/Philippines') oil supply chain: ships → ports → refineries → strategic reserves → retail fuel prices. It has 3 moving parts:

| # | Service | Tech | Port | Job |
|---|---|---|---|---|
| 1 | **Sense (ingest)** | Node.js / Express | `5000` | Pulls live data: crude oil prices (EIA), vessel tracking (AISstream), India retail fuel prices (live scrape), crypto/forex prices, crisis news |
| 2 | **Simulate + Strategize** | Python / FastAPI | `8000` | Runs the causal-graph shock simulation (NetworkX) and the multi-LLM AI playbook generator (Gemini/Groq/NVIDIA) |
| 3 | **War-Room UI** | React 19 / Vite | `5173` | The actual dashboard you look at in a browser |

All 3 must be running simultaneously for the app to fully work. The UI (`5173`) talks to both the other two.

---

## 1. What you need before you start

Check these are installed. Everything here was verified working on the original dev machine at these versions — you don't need these exact versions, just something reasonably close (Node 18+, Python 3.10+).

```bash
node --version      # v22.18.0 on dev machine — need 18+
python3 --version   # 3.12.3 on dev machine — need 3.10+
git --version       # any recent version
```

If any of those fail, install Node.js (via [nodejs.org](https://nodejs.org) or `nvm`) and Python 3 first.

**One optional tool**: `pdftotext` (part of `poppler-utils`). You only need this if you plan to re-run `scripts/parse_ppac_data.py` to regenerate data from the source PDF — you almost certainly won't need to touch this for a normal run/demo, since the data it produces is already committed to the repo. Skip it unless something specifically asks for it.

---

## 2. Clone the repo

```bash
git clone https://github.com/Anbu-00001/Chakravyuh.git
cd Chakravyuh
```

---

## 3. Place the secret env files — **this is the step people get wrong**

Your teammate is sending you files over WhatsApp separately (not through GitHub — these files contain real API keys and are deliberately excluded from the repo via `.gitignore`, which is why `git clone` alone won't give them to you).

**There are two separate `.env` files, and they go in two different folders. Do not merge them or put both in the same place.**

```
Chakravyuh/
├── .env                 ← FILE 1 goes here (repo root)
├── web/
│   └── .env              ← FILE 2 goes here (inside web/)
├── ingest/
├── simulate/
└── strategize/
```

- **File 1 (repo root `.env`)** — used by the Node ingest server and the Python backend. Contains things like `AISSTREAM_API_KEY`, `EIA_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`.
- **File 2 (`web/.env`)** — used by the frontend. Mainly `VITE_MAPTILER_API_KEY` (for the map tiles).

If your teammate only sends you one file, ask which folder it's for — check the first few variable names inside it against the list above (root `.env` vars do **not** have a `VITE_` prefix; `web/.env` vars do).

**Note on `.gitignore`**: this file is a normal tracked file and already comes down with `git clone` — you don't actually need it sent separately. If your teammate sends it anyway, you can ignore it (it's already there, at the repo root, unchanged).

**Do not commit either `.env` file, ever.** They already won't show up in `git status` if placed correctly (that's what `.gitignore` does), but don't force-add them.

---

## 4. Install dependencies (3 separate installs — one per service)

Run these one at a time, from the repo root (`Chakravyuh/`):

```bash
# 1. Ingest service
cd ingest && npm install && cd ..

# 2. Web frontend
cd web && npm install && cd ..

# 3. Python backend
pip install -r simulate/requirements.txt
pip install google-generativeai
```

**Why the extra `pip install google-generativeai` line**: the AI playbook generator supports 3 LLM providers (Groq, Gemini, NVIDIA) with automatic fallback. Groq and NVIDIA are called via raw HTTP and need no extra package. Gemini uses the `google-generativeai` Python package, which isn't listed in `requirements.txt` — the code guards against it being missing and won't crash, but you won't get Gemini-generated playbooks without it, only whichever of Groq/NVIDIA has a working key. Installing it means all 3 providers are available.

(Optional but recommended: do the `pip install` steps inside a virtual environment — `python3 -m venv venv && source venv/bin/activate` — before running the two `pip install` lines above, so this doesn't touch your system Python.)

---

## 5. Start all 3 services

**Order matters a little** — start the backends before the frontend so the UI doesn't show a wall of failed-fetch errors on first load. Open **3 separate terminal windows/tabs**, one per service, and leave them all running.

### Terminal 1 — Ingest (Sense layer)

```bash
cd Chakravyuh/ingest
node index.js
```

Wait for a line like `✅ Live Financial Ticker Updated...` or similar — that confirms it's polling real APIs successfully.

### Terminal 2 — Python backend (Simulate + Strategize)

**Important**: unlike the Node service, the Python backend does **not** automatically read the root `.env` file — you have to export it into your shell first, or the AI playbook generator will silently have no LLM keys available (it degrades gracefully — the app won't crash, but "Generate AI Playbooks" will fail or return nothing).

```bash
cd Chakravyuh
set -a
source .env
set +a
uvicorn simulate.main:app --port 8000 --reload
```

(`set -a` / `set +a` just means "export every variable this source line defines into the shell" — standard bash trick for loading a `.env` file without a library.)

### Terminal 3 — Web frontend

```bash
cd Chakravyuh/web
npm run dev
```

Vite will print the URL — normally `http://localhost:5173`, but if that port's busy it'll pick the next free one (`5174`, etc.) and tell you. Use whatever it prints.

---

## 6. Verify everything is actually working (do this before opening the browser)

Run these three checks. All three should return data, not connection errors:

```bash
curl http://localhost:5000/api/health
curl http://localhost:8000/health
curl http://localhost:5000/api/prices
```

The last one should show real numbers for `brent`, `wti`, and `indiaRetail` (petrol/diesel prices) with a recent date in `asOf` — if you see the same numbers every time you re-run it days apart, or an error, something's wrong (see Troubleshooting).

**Now open `http://localhost:5173` in a browser.**

You should immediately see, at the very top under the header, a red pulsing **"SITREP — LIVE CRISIS"** banner referencing the real Strait of Hormuz crisis. If you see that, the frontend is rendering correctly. If the map underneath it is blank/gray with no tiles, that's almost always the MapTiler key (`web/.env`) — see Troubleshooting.

---

## 7. Walking through the app for a demo / recording a video

The sidebar on the left has 5 icons. In order, top to bottom, here's what each one shows and what's worth saying out loud on camera:

### 1. Tactical Map (shield icon — default view)
- Point out the **SITREP banner** first — say explicitly: *"this isn't a hypothetical scenario, it's modeling the real, ongoing 2026 Strait of Hormuz crisis"* — this is the single most important framing line for judges, because it immediately separates this project from every other "toy simulation" in the room.
- Point out the live map (vessel trails, chokepoints), the Domestic Reserves / Transit Risk Index panel, and the Refinery Status box.
- Bottom-right: the **Energy Markets & Domestic Pump Index** ticker. Point out the `TIER A` / `TIER B` badges — explain this is a deliberate "Reality Ledger" design: every number on screen is honestly labeled as live, periodic, or modeled, never faked.

### 2. Causal Simulator (bar-chart icon)
- Move the **severity slider** — explain it's a real NetworkX directed-graph simulation (ships → ports → refineries → reserves), not a canned animation.
- Click a couple of checkboxes in the **Multi-Strategy Mitigation Combinator** — point out the **"TOTAL RESTORED: +X.X DAYS (LIVE SIM)"** badge updates from a real backend recomputation, not a lookup table.
- Click **"GENERATE AI PLAYBOOKS"** — this triggers the real Groq/Gemini/NVIDIA multi-agent pipeline (Planner → Simulator → Critic). Give it a few seconds; the "EXAMPLE" badge should disappear once real playbooks land.
- Scroll down to the **Pipeline Topology Inspector** — 24-node live graph.

### 3. Adversarial Wargame (crosshair icon)
- Trigger a **Red-Team escalation** at different intensities (MEDIUM/HIGH/CRITICAL) — point out the severity numbers are genuinely distinct per tier (this used to be a bug where MEDIUM and CRITICAL collided at the same value — now fixed and worth mentioning if asked about data integrity).
- Toggle a countermeasure and show the Monte Carlo P10/P50/P90 trajectory recompute live.

### 4. Refinery SCADA & Rationing (factory icon)
- Shows real per-refinery stress (CDU/VDU/FCCU/DHDS units) scaled by each refinery's actual modeled Hormuz-dependency exposure — Jamnagar/Vadinar (high exposure, west coast) visibly stress harder than Vizag/Paradip (lower exposure, east coast). This differentiation is a real modeling detail worth calling out.
- The sectoral rationing sliders (defense/agriculture/power/retail) show a live GDP-loss estimate recomputed from the current deficit.

### 5. Reality Ledger (database icon, bottom of sidebar)
- **Open this last, as the closing beat of the demo.** It's the project's honesty statement: every metric is tiered (Tier A live / Tier B periodic / Tier C modeled), plus the sourced real-world crisis timeline (dated events with named sources: Wikipedia, CNBC, Washington Post, NPR).
- Good closing line for the video: *"Every number you just saw came with a label telling you exactly how real it is — nothing on this dashboard pretends to be live when it isn't."*

**Total run-through time**: 4–6 minutes covers all 5 sections comfortably without rushing.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `EADDRINUSE` / "port already in use" on start | A previous run of the same service is still alive | `lsof -ti:5000 -sTCP:LISTEN \| xargs -r kill` (swap `5000` for `8000`/`5173` as needed), then restart |
| Map area is blank/gray, everything else loads | Missing/invalid `VITE_MAPTILER_API_KEY` in `web/.env` | Confirm `web/.env` exists and has that key; restart the `npm run dev` terminal (Vite only reads env files at startup) |
| Price ticker shows the same numbers no matter when you check, or shows an "EST"/"TIER C" tag instead of live | Root `.env` missing/invalid `EIA_API_KEY`, or the ingest service isn't running | Check Terminal 1's logs for fetch errors; confirm `.env` is at repo root (not inside `ingest/`) |
| "GENERATE AI PLAYBOOKS" spins forever or comes back empty | No valid `GEMINI_API_KEY`/`GROQ_API_KEY`/`NVIDIA_API_KEY` reached the Python process | You almost certainly forgot the `set -a; source .env; set +a` step before starting `uvicorn` — Python does **not** auto-load `.env` like Node does. Stop the process, redo Terminal 2's steps exactly, including the `source .env` line |
| "AIS FEED: SIMULATED" badge instead of live | Normal / expected on many networks | AISstream needs a live WebSocket connection which some networks/firewalls block. The app is deliberately honest about this — it labels the feed as simulated rather than faking live data. Not a bug to fix before a demo, just something you can mention as an example of the project's "no fake data" philosophy if asked |
| `ModuleNotFoundError: No module named 'simulate'` when starting uvicorn | You ran the `uvicorn` command from inside a subfolder instead of the repo root | `cd` back to the repo root (`Chakravyuh/`, the one containing both `simulate/` and `strategize/` as sibling folders) before running the `uvicorn simulate.main:app` command |
| `npm install` hangs or times out | Network/registry issue on your machine, unrelated to this project | Retry, or try a different network; if it's a persistent sandboxed/offline environment, ask whoever set that up how they resolved it originally |
| Browser shows the UI but every number/panel looks stuck on "AWAITING..." / "LOADING…" | Terminal 1 and/or Terminal 2 aren't actually running, or crashed | Check all 3 terminals are still alive with no error output; re-run the `curl` checks in step 6 |

---

## 9. For your AI assistant (if you're using Claude Code or similar to help set this up)

If something in the steps above doesn't match what you're seeing, here's exactly where to look, in order:

1. **`README.md`** (repo root) — the project's own architecture overview and quick-start; cross-check against this doc if anything seems to have changed since this guide was written.
2. **This file's Troubleshooting table (§8)** — check it before re-deriving a fix from scratch.
3. **Actual source of truth for env vars**: `ingest/index.js` (`process.env.X` calls near the top and around the price-polling functions) and `strategize/agents.py` / `strategize/red_team.py` (`os.environ.get(...)` calls) — if a var name in this doc and the code ever disagree, the code is correct and this doc is stale.
4. **Logs**: whatever each of the 3 terminals is printing directly is the fastest signal — this project doesn't write to separate log files, everything goes to stdout in the terminal that launched it.
5. **Backend health/route check**: from the repo root, this one-liner exercises every FastAPI route and prints status codes — anything other than `200` tells you exactly which engine is broken:
   ```bash
   python3 -c "
   from fastapi.testclient import TestClient
   from simulate.main import app
   c = TestClient(app)
   for method, path, body in [('GET','/health',None), ('GET','/api/simulate/baseline',None), ('POST','/api/simulate',{}), ('POST','/api/wargame/redteam',{'intensity':'CRITICAL'}), ('POST','/api/rationing/optimize',{})]:
       r = c.get(path) if method=='GET' else c.post(path, json=body)
       print(method, path, '->', r.status_code)
   "
   ```
6. Do not "fix" a missing-data symptom by inventing/hardcoding a fallback number in the frontend — this project has an explicit, repeatedly-enforced rule that every displayed number must be honestly sourced (see the Reality Ledger modal / `source_attribution` fields throughout `simulate/*.py` and `strategize/*.py` for the established pattern). If real data isn't reachable, the correct fix is an honest loading/fallback state, not a fabricated number.

---

## 10. Shutting everything down

`Ctrl+C` in each of the 3 terminals. If a port still shows as busy afterward:

```bash
lsof -ti:5000 -sTCP:LISTEN | xargs -r kill
lsof -ti:8000 -sTCP:LISTEN | xargs -r kill
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

---

## Quick reference — every command in one block

```bash
# Setup (one-time)
git clone https://github.com/Anbu-00001/Chakravyuh.git
cd Chakravyuh
# → place .env (root) and web/.env (inside web/) now, received via WhatsApp
cd ingest && npm install && cd ..
cd web && npm install && cd ..
pip install -r simulate/requirements.txt
pip install google-generativeai

# Every time you want to run it (3 separate terminals, from repo root):
# Terminal 1
cd ingest && node index.js

# Terminal 2
set -a; source .env; set +a
uvicorn simulate.main:app --port 8000 --reload

# Terminal 3
cd web && npm run dev

# Then open http://localhost:5173
```
