# AGENTS.md — Project Chakravyuh Build Spec
**Sense → Simulate → Strategize: an AI war-room for India's energy supply-chain resilience**

| | |
|---|---|
| **Competition** | ET AI Hackathon 2.0 · PS2 — AI-Driven Energy Supply Chain Resilience for Import-Dependent Economies |
| **Spec compiled/verified against live web sources** | 17 July 2026 |
| **Status of underlying crisis** | 🔴 **LIVE AND UNRESOLVED** — not a historical case study. |

---

## 0. How An Agent Should Read This File

> **If you are an AI agent (Antigravity, Claude Code, Gemini CLI, etc.) executing this build:**
> 1. Read this entire file before writing code or creating any project file.
> 2. Execute **§7 in order** — Phase 1 before Phase 2, etc. Each phase ends with a "Definition of done" gate. Don't start the next phase until the current gate is met.
> 3. Treat **§3 (Reality Ledger)** as a hard constraint on UI copy and code comments: never label a Tier‑B or Tier‑C number as "live."
> 4. Before registering for any external service in §6, list what you're about to sign up for and confirm with the human — don't create accounts or spend money autonomously.
> 5. Every fact in §2 has an "as of 17 Jul 2026" timestamp. This is a fast-moving, contested situation — if your build session happens more than a few days after that date, **web-search the current Hormuz status before finalizing any number that goes on a slide.**

---

## 1. Mission Brief

Most PS2 submissions will be a dashboard with a risk score. We're building a **causal simulation engine + agentic war-room**: a decision-maker asks *"what happens if X,"* watches the shock propagate ships → ports → refineries → reserves → prices, and gets back AI-proposed, re-simulatable mitigation playbooks — a chess engine for national energy policy, not a monitor.

- **Layer 1 — SENSE:** live vessel positions, live news/events, prices. Where lazy teams stop.
- **Layer 2 — SIMULATE:** a transparent, tweakable directed-graph model of India's energy pipeline. `simulate(shock, mitigation) → trajectory`. This is the moat.
- **Layer 3 — STRATEGIZE:** a Planner → Simulator-as-tool → Critic → Explainer agent loop that returns ranked, cited playbooks. This is the wow.

---

## 2. Ground-Truth Update — Verified 17 July 2026

### 2.1 Crisis Timeline & Baseline Stats
- 28 Feb 2026: US/Israeli strikes on Iran begin. IRGC starts boarding/attacking merchant ships.
- 2 Mar 2026: IRGC declares Strait closed. Major carriers suspend transits.
- 17-19 Jun 2026: Blockades temporarily lifted; traffic surges back.
- 11-12 Jul 2026: IRGC strike hits container ship; Iran redeclares closure.
- 17 Jul 2026: Contested/effectively closed per trackers, ~5th consecutive day of fresh US strikes.

### 2.2 Verified India numbers
- Crude import dependency: ~88%
- SPR total capacity: 5.33 MMT across 3 sites (Visakhapatnam, Mangaluru, Padur)
- SPR cover: ~9.5 days at full fill (~5-9.5 days typical reported fill)
- OMC / commercial stocks: ~64.5 additional days
- Combined buffer: ~74 - 80 days

---

## 3. Reality Ledger — What's Actually Buildable

- 🟢 Tier A: AISstream live positions, GDELT 15-min news feed, PPAC daily retail pump prices, great-circle / Cape reroute distances.
- 🟡 Tier B: EIA benchmark oil prices (daily/weekly), India SPR fill level (official releases / periodic), refinery throughput, GDELT Goldstein escalation score.
- 🔴 Tier C: Barrels-in-tank real-time SPR, exact cargo pricing, future CPI / diesel forecasts (scenario ranges only).

---

## 4. Architecture & Data Flow

- Node.js WebSocket proxy for AISstream relay to browser.
- FastAPI backend for Simulation Engine (`/simulate`) and Strategize Agent Loop (`/strategize`).
- React + deck.gl + MapLibre GL UI in `/web`.
