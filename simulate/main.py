import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Union

from simulate.graph_engine import EnergySupplyChainGraph
from simulate.regional_graph import RegionalIndoPacificGraph
from simulate.predictive_maintenance import RefineryStressEngine
from simulate.lpg_graph import LPGSupplyChainGraph
from simulate.backtest import HormuzCrisisBacktest
from strategize.agents import WarRoomAgentPipeline
from strategize.red_team import RedTeamDisruptorAgent
from strategize.rationing_policy import SectoralRationingOptimizer

app = FastAPI(
    title="Chakravyuh Simulation Engine & Agent War-Room",
    description="Layer 2 Causal Simulation, Layer 3 Agent Loop, Phase 4 Regional Wargame & Phase 5 Predictive Maintenance API",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engines
sim_engine = EnergySupplyChainGraph()
regional_engine = RegionalIndoPacificGraph()
refinery_stress_engine = RefineryStressEngine()
lpg_engine = LPGSupplyChainGraph()
backtest_engine = HormuzCrisisBacktest()
agent_pipeline = WarRoomAgentPipeline(seed_data=sim_engine.seed)
red_team_agent = RedTeamDisruptorAgent()
rationing_optimizer = SectoralRationingOptimizer()

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "Chakravyuh Simulation, Agent & Regional Wargame Gateway",
        "verified_date": "2026-07-20",
        "graph_nodes": sim_engine.G.number_of_nodes(),
        "regional_nodes": regional_engine.G.number_of_nodes()
    }

@app.get("/api/simulate/baseline")
def get_baseline():
    return sim_engine.seed.get("country_baseline", {})

@app.get("/api/simulate/topology")
def get_topology(severity_pct: float = 65.0):
    return sim_engine.get_graph_topology(severity_pct=severity_pct)

@app.get("/api/simulate/montecarlo")
def get_monte_carlo(chokepoint: str = "chk_hormuz", severity_pct: float = 65.0, runs: int = 100):
    return regional_engine.run_monte_carlo_simulation(chokepoint_id=chokepoint, severity_pct=severity_pct, runs=runs)

class ShockRequest(BaseModel):
    chokepoint: str = "chk_hormuz"
    severity_pct: float = 65.0
    extra_reroute_days: float = 12.0
    mitigation_applied: Optional[Union[str, List[str]]] = None

@app.post("/api/simulate")
def run_simulation(req: ShockRequest):
    result = sim_engine.simulate_shock(
        chokepoint_id=req.chokepoint,
        severity_pct=req.severity_pct,
        mitigation=req.mitigation_applied
    )
    return {
        "shock": req.chokepoint,
        "severity_pct": req.severity_pct,
        "mitigation": req.mitigation_applied or "None (Unmitigated Cascade)",
        "starting_buffer_days": result["starting_buffer_days"],
        "day_30_buffer_days": result["day_30_buffer_days"],
        "trajectory": result["trajectory"],
        "source_attribution": result["source_attribution"]
    }

class StrategizeRequest(BaseModel):
    chokepoint: str = "chk_hormuz"
    severity_pct: float = 65.0

@app.post("/api/strategize")
def generate_strategize_playbooks(req: StrategizeRequest):
    return agent_pipeline.generate_playbooks(
        shock_type=req.chokepoint,
        severity_pct=req.severity_pct
    )

class RedTeamRequest(BaseModel):
    chokepoint: str = "chk_hormuz"
    intensity: str = "HIGH"

@app.post("/api/wargame/redteam")
def trigger_red_team_attack(req: RedTeamRequest):
    return red_team_agent.generate_escalation_attack(
        base_shock=req.chokepoint,
        intensity=req.intensity
    )

class RefineryStressRequest(BaseModel):
    crude_grade: str = "BASRAH_HEAVY"
    days_in_stress: int = 15

@app.post("/api/simulate/refinery-stress")
def evaluate_refinery_stress(req: RefineryStressRequest):
    return refinery_stress_engine.evaluate_refinery_stress(
        crude_grade_id=req.crude_grade,
        Days_in_stress=req.days_in_stress
    )

@app.post("/api/simulate/backtest")
def run_hormuz_crisis_backtest():
    return backtest_engine.run_backtest()

class RationingRequest(BaseModel):
    national_deficit_pct: float = 30.0
    defense_slider: float = 100.0
    retail_slider: float = 40.0

@app.post("/api/rationing/optimize")
def optimize_sectoral_rationing(req: RationingRequest):
    return rationing_optimizer.optimize_rationing_quotas(
        national_crude_deficit_pct=req.national_deficit_pct,
        custom_defense_slider=req.defense_slider,
        custom_retail_slider=req.retail_slider
    )

class LPGShockRequest(BaseModel):
    severity_pct: float = 65.0
    duration_days: int = 30
    mitigation_applied: Optional[Union[str, List[str]]] = None

@app.post("/api/simulate/lpg")
def run_lpg_simulation(req: LPGShockRequest):
    result = lpg_engine.simulate_lpg_shock(
        severity_pct=req.severity_pct,
        duration_days=req.duration_days,
        mitigation=req.mitigation_applied
    )
    return {
        "severity_pct": req.severity_pct,
        "mitigation": req.mitigation_applied or "None (Unmitigated Cascade)",
        "starting_buffer_days": result["starting_buffer_days"],
        "day_30_buffer_days": result["day_30_buffer_days"],
        "trajectory": result["trajectory"],
        "source_attribution": result["source_attribution"]
    }

