"""
Chakravyuh Layer 2 - Causal Simulation Engine
Graph-based network simulation model of India's crude energy pipeline using NetworkX.
"""

import networkx as nx
import numpy as np
import json
import os

class EnergySupplyChainGraph:
    def __init__(self, seed_file_path=None):
        if seed_file_path is None:
            seed_file_path = os.path.join(os.path.dirname(__file__), "../data/seed.json")
            
        with open(seed_file_path, "r") as f:
            self.seed = json.load(f)
            
        self.G = nx.DiGraph()
        self._build_graph()

    def _build_graph(self):
        # Load real EIA crude flow dataset if available
        eia_flows = {}
        eia_path = os.path.join(os.path.dirname(__file__), "../data/eia_chokepoints_flow.json")
        if os.path.exists(eia_path):
            try:
                with open(eia_path, "r") as ef:
                    eia_raw = json.load(ef)
                    for row in eia_raw.get("response", {}).get("data", []):
                        cid = row.get("countryRegionId")
                        val = float(row.get("value", 0)) * 1000 # convert TBPD to BPD
                        if cid and val > 0:
                            eia_flows[cid] = val
            except Exception as e:
                print("EIA flow parse fallback:", e)

        # 1. Add Source Terminals (bpd = barrels per day) dynamically set from EIA dataset
        irn_bpd = int(eia_flows.get("IRN", 4_400_000) * 0.20) # ~20% of Iran export capacity
        are_bpd = int(eia_flows.get("ARE", 2_700_000) * 0.65) # ~65% of UAE export capacity
        irq_bpd = int(eia_flows.get("IRQ", 1_600_000) * 0.55) # ~55% of Iraq export capacity
        bra_bpd = int(eia_flows.get("BRA", 4_800_000) * 0.30) # ~30% Non-gulf import capacity

        self.G.add_node("src_ras_tanura", name="Ras Tanura (SA)", type="source", baseline_flow_bpd=are_bpd, region="Gulf")
        self.G.add_node("src_kharg_island", name="Kharg Island (IR)", type="source", baseline_flow_bpd=irn_bpd, region="Gulf")
        self.G.add_node("src_mina_ahmadi", name="Mina Al Ahmadi (KW)", type="source", baseline_flow_bpd=irq_bpd, region="Gulf")
        self.G.add_node("src_ras_laffan", name="Ras Laffan (QA)", type="source", baseline_flow_bpd=700_000, region="Gulf")
        self.G.add_node("src_non_gulf", name="West Africa / Americas (Non-Hormuz)", type="source", baseline_flow_bpd=bra_bpd, region="Non-Gulf")

        # 2. Add Chokepoints
        self.G.add_node("chk_hormuz", name="Strait of Hormuz", type="chokepoint", capacity_bpd=4_200_000, transit_days=5)
        self.G.add_node("chk_cape", name="Cape of Good Hope", type="chokepoint", capacity_bpd=10_000_000, transit_days=17)

        # 3. Add Ports
        self.G.add_node("port_vadinar", name="Vadinar / Sikka Port", type="port", capacity_bpd=1_750_000)
        self.G.add_node("port_mumbai", name="JNPT / Mumbai Port", type="port", capacity_bpd=400_000)
        self.G.add_node("port_mangalore", name="New Mangalore Port", type="port", capacity_bpd=350_000)
        self.G.add_node("port_cochin", name="Cochin Port", type="port", capacity_bpd=310_000)
        self.G.add_node("port_vizag", name="Visakhapatnam Port", type="port", capacity_bpd=300_000)

        # 4. Add Refineries (convert MMTPA to bpd: 1 MMTPA ≈ 20,000 bpd)
        for ref in self.seed.get("refineries", []):
            bpd_demand = ref["capacity_mmtpa"] * 20_000
            self.G.add_node(ref["id"], name=ref["name"], type="refinery", demand_bpd=bpd_demand, hormuz_dep=ref["hormuz_dependency_pct"])

        # 5. Add SPR Reserves (MMT to barrels: 1 MMT ≈ 7.33 Million Barrels)
        for spr in self.seed.get("spr_sites", []):
            barrels = spr["capacity_million_barrels"] * 1_000_000
            fill_pct = spr["current_fill_pct"] / 100.0
            self.G.add_node(spr["id"], name=spr["name"], type="spr", max_barrels=barrels, current_barrels=barrels * fill_pct, max_drawdown_bpd=300_000)

        # 6. Add Commercial Stock & Demand Aggregate
        daily_demand_bpd = 5_000_000 # ~5 Million barrels / day crude demand
        self.G.add_node("node_commercial_stock", name="OMC Commercial Stocks", type="buffer", current_barrels=64.5 * daily_demand_bpd)
        self.G.add_node("demand_national", name="National Fuel Demand", type="demand", bpd=daily_demand_bpd)

        # 7. Add Directed Edges with Baseline Capacities
        # Gulf -> Hormuz
        self.G.add_edge("src_ras_tanura", "chk_hormuz", capacity=1_800_000)
        self.G.add_edge("src_kharg_island", "chk_hormuz", capacity=800_000)
        self.G.add_edge("src_mina_ahmadi", "chk_hormuz", capacity=900_000)
        self.G.add_edge("src_ras_laffan", "chk_hormuz", capacity=700_000)

        # Hormuz -> Indian Ports
        self.G.add_edge("chk_hormuz", "port_vadinar", capacity=1_750_000)
        self.G.add_edge("chk_hormuz", "port_mumbai", capacity=400_000)
        self.G.add_edge("chk_hormuz", "port_mangalore", capacity=350_000)
        self.G.add_edge("chk_hormuz", "port_cochin", capacity=310_000)
        self.G.add_edge("chk_hormuz", "port_vizag", capacity=300_000)

        # Non-Gulf & Cape Reroute -> Ports
        self.G.add_edge("src_non_gulf", "port_vadinar", capacity=600_000)
        self.G.add_edge("src_non_gulf", "port_vizag", capacity=800_000)
        self.G.add_edge("chk_cape", "port_vadinar", capacity=1_000_000)
        self.G.add_edge("chk_cape", "port_mangalore", capacity=500_000)

        # Ports -> Refineries
        self.G.add_edge("port_vadinar", "ref_jamnagar", capacity=1_360_000)
        self.G.add_edge("port_vadinar", "ref_vadinar", capacity=400_000)
        self.G.add_edge("port_mumbai", "ref_mumbai", capacity=390_000)
        self.G.add_edge("port_mangalore", "ref_mangaluru", capacity=300_000)
        self.G.add_edge("port_cochin", "ref_kochi", capacity=310_000)
        self.G.add_edge("port_vizag", "ref_vskp", capacity=300_000)
        self.G.add_edge("port_vizag", "ref_paradip", capacity=300_000)

        # SPR -> Refineries / Ports
        self.G.add_edge("spr_vskp", "ref_vskp", capacity=200_000)
        self.G.add_edge("spr_mglr", "ref_mangaluru", capacity=250_000)
        self.G.add_edge("spr_pdr", "ref_kochi", capacity=250_000)

    def get_graph_topology(self, severity_pct=65.0):
        """
        Returns structured nodes and edges with calculated bottleneck stress levels.

        stress_pct is a modeled heuristic, not a measured/forecast figure: the shocked
        chokepoint takes severity_pct directly, refineries scale it by their (also modeled,
        see hormuz_dependency_pct_source in data/seed.json) hormuz_dep exposure, and every
        other supporting node (ports, SPRs, sources) gets a flat 0.4x illustrative pass-through.
        """
        nodes_list = []
        for n, attr in self.G.nodes(data=True):
            node_info = dict(attr)
            node_info["id"] = n
            # Stress calculation
            if n == "chk_hormuz":
                node_info["stress_pct"] = severity_pct
            elif attr.get("type") == "refinery":
                node_info["stress_pct"] = round(severity_pct * (attr.get("hormuz_dep", 50) / 100.0), 1)
            else:
                node_info["stress_pct"] = round(severity_pct * 0.4, 1)
            nodes_list.append(node_info)

        edges_list = []
        for u, v, attr in self.G.edges(data=True):
            edges_list.append({
                "source": u,
                "target": v,
                "capacity": attr.get("capacity", 0)
            })

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "source_attribution": (
                "stress_pct per node is a modeled heuristic (chokepoint = raw severity_pct; "
                "refineries = severity_pct scaled by their modeled hormuz_dep exposure; all "
                "other nodes = a flat 0.4x illustrative pass-through), not a measured or "
                "forecast bottleneck figure"
            )
        }

    def simulate_shock(self, chokepoint_id="chk_hormuz", severity_pct=65.0, duration_days=30, mitigation=None):
        """
        Runs a discrete 30-day time-step propagation over the directed graph.
        Supports single string mitigation or list of combined mitigation strings.
        """
        if isinstance(mitigation, str):
            mitigations = [mitigation]
        elif isinstance(mitigation, list):
            mitigations = mitigation
        else:
            mitigations = []

        normal_hormuz_capacity = 4_200_000
        degraded_hormuz_capacity = normal_hormuz_capacity * (1.0 - (severity_pct / 100.0))
        
        daily_demand = self.G.nodes["demand_national"]["bpd"]
        
        spr_barrels = sum(self.G.nodes[spr]["current_barrels"] for spr in ["spr_vskp", "spr_mglr", "spr_pdr"])
        omc_barrels = self.G.nodes["node_commercial_stock"]["current_barrels"]
        current_reserves = spr_barrels + omc_barrels

        trajectory = []
        reserves_remaining = current_reserves
        
        spr_drawdown_active = "spr_release" in mitigations
        cape_active = "cape_reroute" in mitigations
        demand_control_active = "demand_control" in mitigations

        effective_daily_demand = daily_demand * 0.88 if demand_control_active else daily_demand

        for day in range(1, duration_days + 1):
            inbound_flow = degraded_hormuz_capacity + 1_400_000 # Non-gulf baseline
            
            if cape_active:
                if day > 10:
                    inbound_flow += 1_200_000

            if spr_drawdown_active and day <= 25:
                inbound_flow += 600_000

            daily_deficit = max(0, effective_daily_demand - inbound_flow)
            reserves_remaining = max(0, reserves_remaining - daily_deficit)

            current_cover_days = reserves_remaining / daily_demand
            refinery_throughput_pct = min(100.0, max(25.0, (inbound_flow / daily_demand) * 100.0))

            deficit_pct = (daily_deficit / daily_demand) * 100.0
            # 0.28 INR-per-%-deficit is a modeled illustrative pass-through coefficient (not an
            # official RBI/PPAC retail-price elasticity figure); see source_attribution below.
            price_impact_inr = round(deficit_pct * 0.28, 2)

            # +/-6% uncertainty band is a modeled illustrative confidence envelope, not a
            # statistically fitted forecast interval; see source_attribution below.
            lower_bound = round(current_cover_days * 0.94, 2)
            upper_bound = round(current_cover_days * 1.06, 2)
            
            trajectory.append({
                "day": day,
                "days_of_cover": round(current_cover_days, 2),
                "inbound_flow_bpd": int(inbound_flow),
                "daily_deficit_bpd": int(daily_deficit),
                "refinery_throughput_pct": round(refinery_throughput_pct, 1),
                "retail_price_impact_inr": price_impact_inr,
                "uncertainty_band": [lower_bound, upper_bound]
            })

        return {
            "graph_nodes_count": self.G.number_of_nodes(),
            "graph_edges_count": self.G.number_of_edges(),
            "starting_buffer_days": round(current_reserves / daily_demand, 2),
            "day_30_buffer_days": trajectory[-1]["days_of_cover"],
            "trajectory": trajectory,
            "source_attribution": (
                "starting_buffer_days is derived from data/seed.json's verified SPR/OMC reserve "
                "figures divided by a modeled daily_demand_bpd (5.0M bpd, a round-number "
                "approximation of India's national crude throughput used for internal consistency "
                "with the country_baseline buffer-day figures). retail_price_impact_inr (0.28 "
                "INR per % deficit) and uncertainty_band (+/-6%) are modeled illustrative "
                "coefficients for this causal graph, not officially disclosed pricing/forecast "
                "figures."
            )
        }
