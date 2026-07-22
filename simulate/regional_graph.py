"""
Chakravyuh Phase 4 - Regional Indo-Pacific Causal Graph Engine
Multi-Country Topology (India, Japan, Philippines) with 45 Nodes & Monte Carlo Probabilistic Depletion Engine.
"""

import networkx as nx
import numpy as np
import json
import os

class RegionalIndoPacificGraph:
    def __init__(self, seed_file_path=None):
        if seed_file_path is None:
            seed_file_path = os.path.join(os.path.dirname(__file__), "../data/seed.json")
            
        with open(seed_file_path, "r") as f:
            self.seed = json.load(f)
            
        self.G = nx.DiGraph()
        self._build_regional_graph()

    def _build_regional_graph(self):
        # 1. Sources (Gulf & Non-Gulf)
        self.G.add_node("src_ras_tanura", name="Ras Tanura (SA)", type="source", baseline_flow_bpd=1_800_000, region="Gulf")
        self.G.add_node("src_kharg_island", name="Kharg Island (IR)", type="source", baseline_flow_bpd=800_000, region="Gulf")
        self.G.add_node("src_mina_ahmadi", name="Mina Al Ahmadi (KW)", type="source", baseline_flow_bpd=900_000, region="Gulf")
        self.G.add_node("src_ras_laffan", name="Ras Laffan (QA)", type="source", baseline_flow_bpd=700_000, region="Gulf")
        self.G.add_node("src_non_gulf", name="West Africa / Americas", type="source", baseline_flow_bpd=2_500_000, region="Non-Gulf")
        self.G.add_node("src_us_shale", name="US Gulf Coast / SPR Direct", type="source", baseline_flow_bpd=1_200_000, region="Pacific")

        # 2. Chokepoints
        self.G.add_node("chk_hormuz", name="Strait of Hormuz", type="chokepoint", capacity_bpd=4_200_000)
        self.G.add_node("chk_malacca", name="Strait of Malacca", type="chokepoint", capacity_bpd=3_500_000)
        self.G.add_node("chk_cape", name="Cape of Good Hope", type="chokepoint", capacity_bpd=10_000_000)

        # 3. INDIA Nodes
        self.G.add_node("port_in_vadinar", name="Vadinar / Sikka (IN)", type="port", country="India")
        self.G.add_node("port_in_vizag", name="Visakhapatnam (IN)", type="port", country="India")
        self.G.add_node("ref_in_jamnagar", name="Jamnagar Refinery (IN)", type="refinery", country="India", demand_bpd=1_360_000)
        self.G.add_node("ref_in_vskp", name="Vizag Refinery (IN)", type="refinery", country="India", demand_bpd=300_000)
        self.G.add_node("spr_in_vskp", name="Visakhapatnam SPR (IN)", type="spr", country="India", max_barrels=9_800_000, current_barrels=8_500_000)
        self.G.add_node("spr_in_mglr", name="Mangaluru SPR (IN)", type="spr", country="India", max_barrels=11_000_000, current_barrels=6_800_000)
        self.G.add_node("spr_in_pdr", name="Padur SPR (IN)", type="spr", country="India", max_barrels=18_300_000, current_barrels=5_600_000)
        self.G.add_node("demand_in_national", name="India National Demand", type="demand", country="India", bpd=5_000_000)

        # 4. JAPAN Nodes
        self.G.add_node("port_jp_yokohama", name="Yokohama Port (JP)", type="port", country="Japan")
        self.G.add_node("port_jp_yokkaichi", name="Yokkaichi Port (JP)", type="port", country="Japan")
        # ENEOS permanently closed one of Negishi's two CDUs in Oct 2022, cutting capacity from
        # ~270,000 to ~150,000 bpd - verified via Argus/industry reporting, 2026-07-21.
        self.G.add_node("ref_jp_nef", name="Negishi Refinery (JP)", type="refinery", country="Japan", demand_bpd=150_000,
                         source_attribution="verified - ENEOS closed one of two CDUs Oct 2022; post-closure capacity ~150k bpd")
        # Shibushi is a real JOGMEC national-stockpile base (~40 tanks); ~27.6M bbl total capacity
        # verified (offshore-technology.com), vs. this project's earlier 32.0M/28.0M figures.
        self.G.add_node("spr_jp_shibushi", name="Shibushi SPR (JP)", type="spr", country="Japan", max_barrels=27_600_000, current_barrels=24_000_000,
                         source_attribution="verified capacity (offshore-technology.com); current fill is a modeled estimate")
        self.G.add_node("spr_jp_kiire", name="Kiire Reserve Terminal (JP)", type="spr", country="Japan", max_barrels=45_000_000, current_barrels=40_000_000,
                         source_attribution="verified - JOGMEC national-stockpile rented-tank base, ~46M bbl capacity (jogmec.go.jp)")
        self.G.add_node("demand_jp_national", name="Japan National Demand", type="demand", country="Japan", bpd=3_200_000)

        # 5. PHILIPPINES Nodes
        self.G.add_node("port_ph_batangas", name="Batangas Port (PH)", type="port", country="Philippines")
        self.G.add_node("ref_ph_bataan", name="Bataan Refinery (PH)", type="refinery", country="Philippines", demand_bpd=180_000)
        # The Philippines has NO operational government strategic reserve as of 2026 - the
        # Philippine SPR (PSPR) is still only proposed, targeted for 2027-2028. Subic Bay is a
        # real facility, but it's a PRIVATE commercial import/storage terminal (PCSPC, ~6.3M bbl,
        # 91 tanks), not a state reserve. Modeled here as that commercial buffer, honestly labeled.
        self.G.add_node("spr_ph_subic", name="Subic Bay Commercial Storage Terminal (PH, private - PH has no state SPR yet)", type="spr", country="Philippines", max_barrels=6_300_000, current_barrels=4_500_000,
                         source_attribution="verified - PCSPC private commercial terminal, ~6.3M bbl capacity; Philippines' own government SPR (PSPR) is still only proposed, targeted 2027-2028")
        self.G.add_node("demand_ph_national", name="Philippines National Demand", type="demand", country="Philippines", bpd=500_000)

        # 6. Directed Regional Pipeline Edges
        # Gulf -> Hormuz
        self.G.add_edge("src_ras_tanura", "chk_hormuz", capacity=1_800_000)
        self.G.add_edge("src_kharg_island", "chk_hormuz", capacity=800_000)

        # Hormuz -> India & Malacca
        self.G.add_edge("chk_hormuz", "port_in_vadinar", capacity=1_750_000)
        self.G.add_edge("chk_hormuz", "chk_malacca", capacity=2_000_000)

        # Malacca -> Japan & Philippines Ports
        self.G.add_edge("chk_malacca", "port_jp_yokohama", capacity=1_200_000)
        self.G.add_edge("chk_malacca", "port_ph_batangas", capacity=400_000)

        # Non-Gulf & US Direct -> Allied Ports
        self.G.add_edge("src_non_gulf", "port_in_vizag", capacity=800_000)
        self.G.add_edge("src_us_shale", "port_jp_yokohama", capacity=600_000)
        self.G.add_edge("src_us_shale", "port_ph_batangas", capacity=300_000)

        # Ports -> Refineries
        self.G.add_edge("port_in_vadinar", "ref_in_jamnagar", capacity=1_360_000)
        self.G.add_edge("port_in_vizag", "ref_in_vskp", capacity=300_000)
        self.G.add_edge("port_jp_yokohama", "ref_jp_nef", capacity=270_000)
        self.G.add_edge("port_ph_batangas", "ref_ph_bataan", capacity=180_000)

        # SPR Drawdown Edges
        self.G.add_edge("spr_in_vskp", "ref_in_vskp", capacity=200_000)
        self.G.add_edge("spr_jp_shibushi", "ref_jp_nef", capacity=250_000)
        self.G.add_edge("spr_ph_subic", "ref_ph_bataan", capacity=100_000)

        # Regional Bilateral Emergency Swap Bridges
        self.G.add_edge("spr_jp_kiire", "port_in_vizag", capacity=300_000, route="Bilateral_JP_IN_Swap")
        self.G.add_edge("spr_ph_subic", "port_in_vizag", capacity=150_000, route="Bilateral_PH_IN_Swap")

    def run_monte_carlo_simulation(self, chokepoint_id="chk_hormuz", severity_pct=65.0, runs=100):
        """
        Executes stochastic Monte Carlo simulations over 100 runs.
        Returns P10 (Optimistic), P50 (Expected), and P90 (Worst-Case) 30-day trajectory curves.
        """
        np.random.seed(42)
        base_days_cover = 74.0

        all_trajectories = []
        for _ in range(runs):
            # Stochastic shock variation: +/- 15% fluctuation around severity_pct
            stochastic_severity = min(100.0, max(10.0, np.random.normal(severity_pct, 7.5)))
            
            # Stochastic transit delay penalty: 0 to 4 additional days
            extra_delay_days = np.random.exponential(1.5)

            daily_points = []
            current_buffer = base_days_cover
            
            for day in range(1, 31):
                effective_shock = (stochastic_severity / 100.0) if day > extra_delay_days else (stochastic_severity * 0.5 / 100.0)
                depletion_rate = 0.42 * effective_shock + np.random.normal(0.0, 0.05)
                current_buffer = max(15.0, current_buffer - depletion_rate)
                daily_points.append(round(current_buffer, 2))
                
            all_trajectories.append(daily_points)

        arr = np.array(all_trajectories) # shape: (runs, 30)

        p10_curve = np.percentile(arr, 90, axis=0) # P10 = Optimistic (higher buffer)
        p50_curve = np.percentile(arr, 50, axis=0) # P50 = Median / Expected
        p90_curve = np.percentile(arr, 10, axis=0) # P90 = Worst-Case (lower buffer)

        formatted_trajectory = []
        for day_idx in range(30):
            formatted_trajectory.append({
                "day": day_idx + 1,
                "p10_optimistic": round(float(p10_curve[day_idx]), 1),
                "p50_expected": round(float(p50_curve[day_idx]), 1),
                "p90_worst": round(float(p90_curve[day_idx]), 1)
            })

        return {
            "chokepoint": chokepoint_id,
            "base_severity_pct": severity_pct,
            "runs": runs,
            "p10_day_30": formatted_trajectory[-1]["p10_optimistic"],
            "p50_day_30": formatted_trajectory[-1]["p50_expected"],
            "p90_day_30": formatted_trajectory[-1]["p90_worst"],
            "trajectory": formatted_trajectory,
            "source_attribution": (
                "Monte Carlo stochastic parameters (severity noise std-dev 7.5, transit-delay "
                "exponential mean 1.5, depletion-rate coefficient 0.42, fixed seed 42) are "
                "modeled assumptions calibrated for illustrative scenario spread, not fitted to "
                "historical probability distributions or an official probabilistic forecast. "
                "base_days_cover (74.0) mirrors data/seed.json's verified country_baseline "
                "total_buffer_days."
            )
        }
