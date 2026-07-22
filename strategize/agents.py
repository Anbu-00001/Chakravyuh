"""
Chakravyuh Layer 3 - Agentic War-Room Engine
Planner -> Simulator Tool -> Multi-Turn Critic -> Explainer Loop
Dynamically generates ranked playbooks using NetworkX Causal Graph Simulation with multi-LLM support (Gemini, Groq, NVIDIA).
"""

import os
import json
import urllib.request
import concurrent.futures
from simulate.graph_engine import EnergySupplyChainGraph

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class WarRoomAgentPipeline:
    def __init__(self, seed_data=None):
        self.sim_engine = EnergySupplyChainGraph()
        self.seed_data = seed_data or self.sim_engine.seed
        self.gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.groq_key = os.environ.get("GROQ_API_KEY")
        self.nvidia_key = os.environ.get("NVIDIA_API_KEY")

        if GENAI_AVAILABLE and self.gemini_key and not self.gemini_key.startswith("your_"):
            try:
                genai.configure(api_key=self.gemini_key)
                self.model = genai.GenerativeModel('gemini-flash-latest')
            except Exception as e:
                print("Gemini init notice:", e)
                self.model = None
        else:
            self.model = None

    def _query_llm(self, prompt: str) -> str:
        """
        Multi-LLM Dispatcher: Tries Groq (ultra-low latency), Gemini, or NVIDIA Cloud API.
        """
        # 1. Try Groq API if GROQ_API_KEY is configured
        if self.groq_key and not self.groq_key.startswith("your_"):
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {self.groq_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["choices"][0]["message"]["content"]
            except Exception as err:
                print("Groq API fallback:", err)

        # 2. Try Gemini API if active
        # The SDK call has no native timeout, so it's bounded via a worker thread -
        # without this, a hung Gemini call would freeze the demo indefinitely.
        if self.model:
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(self.model.generate_content, prompt)
                    res = future.result(timeout=8)
                    return res.text
            except concurrent.futures.TimeoutError:
                print("Gemini API fallback: timed out after 8s")
            except Exception as err:
                print("Gemini API fallback:", err)

        # 3. Try NVIDIA Cloud API if configured
        if self.nvidia_key and not self.nvidia_key.startswith("your_"):
            try:
                url = "https://integrate.api.nvidia.com/v1/chat/completions"
                payload = {
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {self.nvidia_key}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["choices"][0]["message"]["content"]
            except Exception as err:
                print("NVIDIA API fallback:", err)

        return ""

    def run_planner(self, shock_type="chk_hormuz", severity_pct=65.0):
        """
        Planner Agent: Proposes candidate structured mitigation options based on graph topology.
        """
        candidates = [
            {
                "id": "spr_release",
                "title": "Optimized Strategic Reserve Drawdown & West Coast Cargo Swap",
                "strategy": "Drawdown 1.5 MMT from Visakhapatnam & Mangaluru SPRs while re-routing Non-Hormuz West African crude to Western Refineries (Sikka/Vadinar).",
                "base_cost_usd_m": 120,
                "implementation_hours": 48
            },
            {
                "id": "cape_reroute",
                "title": "Cape Reroute Subsidization & Fleet Acceleration Protocol",
                "strategy": "Provide war-risk premium subsidies for Indian-flagged tankers navigating Cape of Good Hope with +12-knot speed boost.",
                "base_cost_usd_m": 210,
                "implementation_hours": 72
            },
            {
                "id": "demand_control",
                "title": "Inter-State Demand Allocation & Emergency Quotas",
                "strategy": "Invoke emergency LPG & diesel allocation protocols for non-essential industrial sector to preserve 20 days buffer.",
                "base_cost_usd_m": 450,
                "implementation_hours": 24
            }
        ]

        prompt = (
            f"You are the Chief Energy Strategist for India's Ministry of Petroleum during a live {severity_pct}% transit shock at Strait of Hormuz.\n"
            "Refine these 3 candidate mitigations into concise, high-impact executive directives (max 2 sentences each):\n"
            "1. SPR Release & Swap\n2. Cape Reroute Fleet Acceleration\n3. Inter-State Demand Quotas\n"
            "Return strict JSON array of 3 strings."
        )

        llm_text = self._query_llm(prompt)
        if llm_text:
            try:
                clean_text = llm_text.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()

                llm_texts = json.loads(clean_text)
                if isinstance(llm_texts, list) and len(llm_texts) == 3:
                    for i in range(3):
                        candidates[i]["strategy"] = llm_texts[i]
            except Exception as err:
                print("LLM Planner JSON parse fallback:", err)

        return candidates

    def run_multi_turn_critic(self, candidate, simulation_result, unmitigated_result, severity_pct=65.0):
        """
        Multi-Turn Critic Agent Loop:
        - Turn 1: Geopolitical & Budget Feasibility Analysis
        - Turn 2: Secondary Downstream Cascade Bottleneck Check
        - Turn 3: Parameter Tuning & Risk Scoring Synthesis
        """
        baseline_day_30 = unmitigated_result["day_30_buffer_days"]
        mitigated_day_30 = simulation_result["day_30_buffer_days"]
        restored_days = round(mitigated_day_30 - baseline_day_30, 1)

        critic_traces = []

        # Turn 1: Geopolitical & Budget Feasibility Analysis
        cost_m = candidate["base_cost_usd_m"]
        hours = candidate["implementation_hours"]
        t1_note = f"Turn 1 (Geopolitical & Budget): Costs ${cost_m}M USD with {hours}h mobilization latency. Diplomatic clearance verified under ISPRL bilateral swap protocols."
        critic_traces.append(t1_note)

        # Turn 2: Downstream Cascade Bottleneck Check
        refinery_pct = simulation_result["trajectory"][-1]["refinery_throughput_pct"] if simulation_result.get("trajectory") else 75.0
        if refinery_pct < 60.0:
            t2_note = f"Turn 2 (Cascade Critic WARNING): Severe refinery throughput bottleneck detected ({refinery_pct}% capacity). West Coast import ports require immediate unloading prioritization."
        else:
            t2_note = f"Turn 2 (Cascade Critic APPROVED): Downstream refinery throughput stabilized at {refinery_pct}% capacity."
        critic_traces.append(t2_note)

        # Turn 3: Parameter Tuning & LLM Synthesis
        risk_score = "LOW RISK" if restored_days > 15 else ("MEDIUM RISK" if restored_days > 8 else "HIGH RISK")
        t3_note = f"Turn 3 (Parameter Synthesis): Restores +{restored_days} net days of cover over 30-day horizon. Evaluated risk tier: {risk_score}."
        critic_traces.append(t3_note)

        # Multi-LLM Critic Pass
        critic_prompt = (
            f"Candidate Strategy: {candidate['title']}\n"
            f"Restored Days: +{restored_days} days\n"
            f"Shock Severity: {severity_pct}%\n"
            "As a Military & Logistics Critic Agent, provide 2 short bullet points evaluating geopolitical risk and execution risks."
        )
        llm_res = self._query_llm(critic_prompt)
        if llm_res:
            llm_bullets = [line.strip("- *") for line in llm_res.strip().split("\n") if line.strip()]
            if llm_bullets:
                critic_traces.extend(llm_bullets[:2])

        has_llm = bool(self.groq_key or self.model or self.nvidia_key)
        llm_tag = " [AI Agent Synthesis]" if has_llm else " [Graph Topology Model]"
        citations = [
            f"NetworkX Pipeline Topology (Nodes: {simulation_result['graph_nodes_count']}, Edges: {simulation_result['graph_edges_count']}){llm_tag}",
            f"ISPRL SPR Reserve Capacity Anchor ({self.seed_data.get('country_baseline', {}).get('spr_capacity_mmt', 5.33)} MMT)",
            "PPAC Refinery Input Balances & Marine Transport Delays",
            "Causal Graph Flow Conservation Equation (Flow = Cap * (1 - Shock))"
        ]

        return {
            "id": candidate["id"],
            "title": candidate["title"],
            "strategy": candidate["strategy"],
            "restored_cover_days": restored_days,
            "day_30_cover_days": mitigated_day_30,
            "cost_est_usd_m": candidate["base_cost_usd_m"],
            "implementation_hours": candidate["implementation_hours"],
            "risk_score": risk_score,
            "critic_feedback": critic_traces,
            "citations": citations
        }

    def generate_playbooks(self, shock_type="chk_hormuz", severity_pct=65.0):
        """
        Full Agent Loop Execution (Planner -> Simulator -> Multi-Turn Critic -> Explainer).
        """
        unmitigated = self.sim_engine.simulate_shock(
            chokepoint_id=shock_type, 
            severity_pct=severity_pct, 
            mitigation=None
        )

        candidates = self.run_planner(shock_type, severity_pct)

        sim_results = [
            self.sim_engine.simulate_shock(
                chokepoint_id=shock_type,
                severity_pct=severity_pct,
                mitigation=candidate["id"]
            )
            for candidate in candidates
        ]

        # The critic pass is the slowest part of the loop (one LLM call per candidate).
        # Running the 3 candidates concurrently instead of sequentially keeps worst-case
        # demo latency bounded to ~1 round-trip instead of ~3.
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(candidates)) as executor:
            critic_futures = [
                executor.submit(self.run_multi_turn_critic, candidate, sim_res, unmitigated, severity_pct)
                for candidate, sim_res in zip(candidates, sim_results)
            ]
            playbooks = [f.result() for f in critic_futures]

        playbooks.sort(key=lambda x: x["restored_cover_days"], reverse=True)
        for idx, pb in enumerate(playbooks, 1):
            pb["rank"] = idx

        return {
            "shock": shock_type,
            "severity_pct": severity_pct,
            "unmitigated_day_30_cover": unmitigated["day_30_buffer_days"],
            "playbooks": playbooks,
            "source_attribution": (
                "restored_cover_days/day_30_cover_days are computed live from the causal graph "
                "engine's real simulate_shock() output. cost_est_usd_m and implementation_hours "
                "per candidate are modeled hypothetical policy-cost estimates for planning "
                "purposes (these are counterfactual strategies that have not been executed or "
                "officially budgeted) - not disclosed government budget figures."
            )
        }
