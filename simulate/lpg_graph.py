"""
Chakravyuh Layer 2 - LPG (Cooking Gas) Supply Chain Simulation Engine
Graph-based network model of India's LPG import & distribution pipeline using NetworkX.

Why this exists: the crude-oil model (graph_engine.py) does not capture LPG, yet LPG is
arguably India's single most Hormuz-exposed product - roughly 60% of India's LPG is
imported (vs. ~88% crude import dependency), and a large share of that transits the
Strait of Hormuz. The Government of India is actively racing to close this gap in 2026:
LPG import terminal count is roughly doubling nationally (11 -> 22), the LPG pipeline
network is expanding from ~2,311 km to ~6,242 km, and domestic refinery LPG output is
rising ~36% specifically to cut import reliance.

Reality-Ledger discipline: the four figures above (60% import dependency, 11->22
terminals, 2,311km->6,242km pipeline buildout, ~36% domestic output increase) are
treated as verified/reported context. Every other quantity in this file - per-source and
per-terminal mt/day throughput splits, national LPG demand baseline, bottling buffer
cover days, mitigation magnitudes/timings - is a MODELED ESTIMATE needed to make the
graph function, clearly tagged via `source_attribution` fields and never presented as an
official disclosed figure. This mirrors the source_attribution convention already used
throughout data/seed.json and graph_engine.py / regional_graph.py.
"""

import networkx as nx
import numpy as np
import json
import os


class LPGSupplyChainGraph:
    def __init__(self, seed_file_path=None):
        if seed_file_path is None:
            seed_file_path = os.path.join(os.path.dirname(__file__), "../data/seed.json")

        with open(seed_file_path, "r") as f:
            self.seed = json.load(f)

        self.G = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        # 1. Gulf LPG Export Sources (mtd = metric tons per day)
        # Baseline flow is a MODELED estimate of each terminal's typical LPG export
        # allocation toward India - not an official disclosed per-terminal figure.
        self.G.add_node("src_ras_tanura", name="Ras Tanura (SA)", type="source",
                         baseline_flow_mtd=9_000, region="Gulf",
                         source_attribution="estimated - modeled share of Saudi Aramco LPG exports toward India")
        self.G.add_node("src_ruwais", name="Ruwais LPG Terminal (UAE)", type="source",
                         baseline_flow_mtd=6_500, region="Gulf",
                         source_attribution="estimated - modeled share of ADNOC LPG exports toward India")
        self.G.add_node("src_ras_laffan", name="Ras Laffan (QA)", type="source",
                         baseline_flow_mtd=11_000, region="Gulf",
                         source_attribution="estimated - Qatar is the world's largest LPG exporter; figure is a modeled share toward India, not an official contract volume")
        self.G.add_node("src_mina_ahmadi", name="Mina Al Ahmadi (KW)", type="source",
                         baseline_flow_mtd=4_000, region="Gulf",
                         source_attribution="estimated - modeled share of KPC LPG exports toward India")
        self.G.add_node("src_non_gulf_lpg", name="US / Non-Hormuz LPG Cargoes", type="source",
                         baseline_flow_mtd=5_500, region="Non-Gulf",
                         source_attribution="estimated - modeled non-Hormuz LPG import volume (e.g. US Gulf Coast VLGC cargoes)")

        # 2. Chokepoint
        self.G.add_node("chk_hormuz", name="Strait of Hormuz", type="chokepoint",
                         capacity_mtd=30_500, transit_days=5)

        # 3. Indian LPG Import Terminals (real, plausible candidate ports)
        # National terminal count is roughly doubling 11 -> 22 in the 2026 buildout
        # (verified/reported). Per-terminal capacity below is a MODELED ESTIMATE
        # distributing India's ~60% LPG import dependency across these ports - not an
        # official PPAC per-terminal disclosure.
        self.G.add_node("term_kandla", name="Kandla LPG Import Terminal", type="terminal",
                         capacity_mtd=7_500,
                         source_attribution="estimated - modeled terminal throughput")
        self.G.add_node("term_jnpt", name="JNPT / Mumbai LPG Terminal", type="terminal",
                         capacity_mtd=6_000,
                         source_attribution="estimated - modeled terminal throughput")
        self.G.add_node("term_mangalore", name="Mangalore LPG Import Terminal", type="terminal",
                         capacity_mtd=5_000,
                         source_attribution="estimated - modeled terminal throughput")
        self.G.add_node("term_vizag", name="Visakhapatnam LPG Import Terminal", type="terminal",
                         capacity_mtd=4_500,
                         source_attribution="estimated - modeled terminal throughput")
        self.G.add_node("term_kochi", name="Kochi LPG Import Terminal", type="terminal",
                         capacity_mtd=4_500,
                         source_attribution="estimated - modeled terminal throughput")

        # 4. Domestic LPG Production (refinery-linked; feeds bottling plants directly and
        # does NOT transit Hormuz). Domestic output rising ~36% in 2026 specifically to
        # cut import reliance (verified/reported); baseline mtd below is a MODELED
        # derivation (~40% domestic share of modeled national demand), not an official
        # refinery-level disclosure.
        self.G.add_node("node_domestic_lpg_output", name="Domestic Refinery LPG Output", type="production",
                         baseline_flow_mtd=32_500,
                         source_attribution="estimated - derived from ~40% domestic share of modeled national LPG demand")

        # 5. Bottling / Distribution Buffer (analogous to OMC commercial crude stock)
        daily_demand_mtd = 79_500  # modeled from typical ~29 MMT/yr India LPG consumption
        self.G.add_node("node_bottling_stock", name="OMC LPG Bottling Plant Buffer Stock", type="buffer",
                         current_tonnes=18 * daily_demand_mtd,
                         source_attribution="estimated - modeled ~18 days of typical bottling-plant buffer cover")

        # 6. National LPG Demand Aggregate
        self.G.add_node("demand_national_lpg", name="National LPG (Cooking Gas) Demand", type="demand",
                         mtd=daily_demand_mtd, import_dependency_pct=60.0,
                         source_attribution="import_dependency_pct is verified/reported (~60% of India's LPG is imported, vs ~88% crude); mtd is a modeled estimate")

        # 7. Directed Edges with Baseline Capacities
        # Gulf -> Hormuz
        self.G.add_edge("src_ras_tanura", "chk_hormuz", capacity=9_000)
        self.G.add_edge("src_ruwais", "chk_hormuz", capacity=6_500)
        self.G.add_edge("src_ras_laffan", "chk_hormuz", capacity=11_000)
        self.G.add_edge("src_mina_ahmadi", "chk_hormuz", capacity=4_000)

        # Hormuz -> Indian Import Terminals
        self.G.add_edge("chk_hormuz", "term_kandla", capacity=7_500)
        self.G.add_edge("chk_hormuz", "term_jnpt", capacity=6_000)
        self.G.add_edge("chk_hormuz", "term_mangalore", capacity=5_000)
        self.G.add_edge("chk_hormuz", "term_vizag", capacity=4_500)
        self.G.add_edge("chk_hormuz", "term_kochi", capacity=4_500)

        # Non-Gulf reroute -> Terminals
        self.G.add_edge("src_non_gulf_lpg", "term_jnpt", capacity=3_000)
        self.G.add_edge("src_non_gulf_lpg", "term_kandla", capacity=2_500)

        # Terminals -> National Demand
        self.G.add_edge("term_kandla", "demand_national_lpg", capacity=7_500)
        self.G.add_edge("term_jnpt", "demand_national_lpg", capacity=6_000)
        self.G.add_edge("term_mangalore", "demand_national_lpg", capacity=5_000)
        self.G.add_edge("term_vizag", "demand_national_lpg", capacity=4_500)
        self.G.add_edge("term_kochi", "demand_national_lpg", capacity=4_500)

        # Domestic Production -> Demand (Hormuz-independent path)
        self.G.add_edge("node_domestic_lpg_output", "demand_national_lpg", capacity=32_500)

        # Bottling Buffer -> Demand
        self.G.add_edge("node_bottling_stock", "demand_national_lpg", capacity=daily_demand_mtd)

    def simulate_lpg_shock(self, severity_pct=65.0, duration_days=30, mitigation=None):
        """
        Runs a discrete day-by-day LPG depletion trajectory, analogous to
        EnergySupplyChainGraph.simulate_shock() but tracking "days of LPG cover"
        instead of crude cover. Domestic refinery LPG output is treated as
        Hormuz-independent and keeps flowing at its baseline rate throughout the shock.

        Supports single string mitigation or list of combined mitigation strings:
          - "terminal_expansion": models the government's 2026 terminal-doubling
            buildout (11 -> 22 terminals) coming online mid-shock, not instantly.
          - "buffer_release": accelerated drawdown of OMC bottling-plant buffer stock.
          - "demand_control": cooking-gas rationing / demand curtailment.
        """
        if isinstance(mitigation, str):
            mitigations = [mitigation]
        elif isinstance(mitigation, list):
            mitigations = mitigation
        else:
            mitigations = []

        normal_hormuz_capacity = self.G.nodes["chk_hormuz"]["capacity_mtd"]
        degraded_hormuz_capacity = normal_hormuz_capacity * (1.0 - (severity_pct / 100.0))

        daily_demand = self.G.nodes["demand_national_lpg"]["mtd"]
        non_gulf_baseline = self.G.nodes["src_non_gulf_lpg"]["baseline_flow_mtd"]
        domestic_output = self.G.nodes["node_domestic_lpg_output"]["baseline_flow_mtd"]
        buffer_tonnes = self.G.nodes["node_bottling_stock"]["current_tonnes"]

        reserves_remaining = buffer_tonnes

        terminal_expansion_active = "terminal_expansion" in mitigations
        buffer_release_active = "buffer_release" in mitigations
        demand_control_active = "demand_control" in mitigations

        effective_daily_demand = daily_demand * 0.90 if demand_control_active else daily_demand

        trajectory = []
        for day in range(1, duration_days + 1):
            inbound_flow = degraded_hormuz_capacity + non_gulf_baseline + domestic_output

            if terminal_expansion_active and day > 15:
                inbound_flow += 9_000

            if buffer_release_active and day <= 20:
                inbound_flow += 2_500

            daily_deficit = max(0, effective_daily_demand - inbound_flow)
            reserves_remaining = max(0, reserves_remaining - daily_deficit)

            current_cover_days = reserves_remaining / daily_demand
            terminal_throughput_pct = min(100.0, max(20.0, (inbound_flow / daily_demand) * 100.0))

            deficit_pct = (daily_deficit / daily_demand) * 100.0
            cylinder_price_impact_inr = round(deficit_pct * 0.35, 2)

            lower_bound = round(current_cover_days * 0.92, 2)
            upper_bound = round(current_cover_days * 1.08, 2)

            trajectory.append({
                "day": day,
                "days_of_lpg_cover": round(current_cover_days, 2),
                "inbound_flow_mtd": int(inbound_flow),
                "daily_deficit_mtd": int(daily_deficit),
                "terminal_throughput_pct": round(terminal_throughput_pct, 1),
                "cylinder_price_impact_inr": cylinder_price_impact_inr,
                "uncertainty_band": [lower_bound, upper_bound]
            })

        return {
            "graph_nodes_count": self.G.number_of_nodes(),
            "graph_edges_count": self.G.number_of_edges(),
            "starting_buffer_days": round(buffer_tonnes / daily_demand, 2),
            "day_30_buffer_days": trajectory[-1]["days_of_lpg_cover"],
            "trajectory": trajectory,
            "source_attribution": {
                "verified_reported": [
                    "India imports ~60% of its LPG, vs ~88% crude import dependency",
                    "LPG import terminal count roughly doubling nationally (11 -> 22) in 2026 buildout",
                    "LPG pipeline network expanding from ~2,311 km to ~6,242 km",
                    "Domestic refinery LPG output rising ~36% specifically to cut import reliance"
                ],
                "modeled_estimates": [
                    "Per-source and per-terminal mt/day throughput splits",
                    "National LPG demand baseline (~79,500 mt/day, derived from typical ~29 MMT/yr consumption)",
                    "OMC bottling-plant buffer cover (~18 days)",
                    "Mitigation magnitude/timing assumptions (terminal_expansion, buffer_release, demand_control)"
                ]
            }
        }
