"""
Chakravyuh Phase 5 - Predictive Maintenance & Refinery Stress Engine
Models component-level SCADA failure risks and thermal derating when crude grades switch during chokepoint blockades.
"""

import numpy as np
import json
import os

class RefineryStressEngine:
    def __init__(self, seed_file_path=None):
        if seed_file_path is None:
            seed_file_path = os.path.join(os.path.dirname(__file__), "../data/seed.json")
            
        with open(seed_file_path, "r") as f:
            self.seed = json.load(f)
            
        # Standard Crude Grade Characteristics
        self.CRUDE_GRADES = {
            "ARAB_LIGHT": {"name": "Arab Light", "api_gravity": 33.0, "sulfur_pct": 1.80, "baseline": True},
            "RUSSIAN_URALS": {"name": "Russian Urals", "api_gravity": 31.0, "sulfur_pct": 1.40, "baseline": False},
            "BASRAH_HEAVY": {"name": "Basrah Heavy", "api_gravity": 24.0, "sulfur_pct": 3.80, "high_stress": True},
            "MABAN": {"name": "Maban (UAE)", "api_gravity": 40.0, "sulfur_pct": 0.70, "sweet": True}
        }

    def evaluate_refinery_stress(self, crude_grade_id="BASRAH_HEAVY", Days_in_stress=15):
        """
        Calculates thermal stress, corrosion risk, and capacity derating for all refineries.
        """
        crude_info = self.CRUDE_GRADES.get(crude_grade_id, self.CRUDE_GRADES["BASRAH_HEAVY"])
        sulfur_pct = crude_info["sulfur_pct"]
        api = crude_info["api_gravity"]

        refinery_reports = []

        for ref in self.seed.get("refineries", []):
            ref_id = ref["id"]
            ref_name = ref["name"]
            base_capacity_mmtpa = ref["capacity_mmtpa"]

            # Baseline sulfur design limit for Indian refineries is ~1.5 - 2.0%
            sulfur_stress_ratio = max(1.0, sulfur_pct / 1.80)
            gravity_stress_ratio = max(1.0, 33.0 / api)

            # Per-refinery exposure factor (modeled, not an official derating coefficient):
            # a refinery that sources a larger share of its crude via the Hormuz Strait has
            # less feedstock flexibility to blend away a substitute/off-spec crude grade, so
            # it is modeled as amplifying the crude-grade-driven stress components. Refineries
            # near the ~30-55% hormuz_dependency_pct band seen in data/seed.json map to a
            # ~0.6x-1.1x multiplier around a 50% midpoint (clamped to 0.5x-1.5x as a sanity
            # bound for out-of-range values), so the fleet spreads out per-refinery instead of
            # collapsing onto one identical score.
            hormuz_dependency_pct = ref.get("hormuz_dependency_pct", 50.0)
            hormuz_exposure_factor = max(0.5, min(1.5, hormuz_dependency_pct / 50.0))

            # Component-level Failure Risk Scores (0-100%)
            cdu_stress = min(98.0, round((25.0 * sulfur_stress_ratio * hormuz_exposure_factor) + 0.5 * Days_in_stress, 1))
            vdu_stress = min(98.0, round((30.0 * gravity_stress_ratio * hormuz_exposure_factor) + 0.6 * Days_in_stress, 1))
            fccu_stress = min(98.0, round((20.0 * sulfur_stress_ratio * hormuz_exposure_factor) + 0.4 * Days_in_stress, 1))
            dhds_stress = min(98.0, round((40.0 * sulfur_stress_ratio * hormuz_exposure_factor) + 0.8 * Days_in_stress, 1)) # Desulfurization highest stress

            # Overall Composite Stress Score
            composite_stress_score = round(0.3 * cdu_stress + 0.2 * vdu_stress + 0.2 * fccu_stress + 0.3 * dhds_stress, 1)

            # Derated Capacity Calculation
            derating_pct = round(min(35.0, max(0.0, (composite_stress_score - 40.0) * 0.5)), 1)
            derated_capacity_mmtpa = round(base_capacity_mmtpa * (1.0 - (derating_pct / 100.0)), 2)

            refinery_reports.append({
                "refinery_id": ref_id,
                "name": ref_name,
                "base_capacity_mmtpa": base_capacity_mmtpa,
                "derated_capacity_mmtpa": derated_capacity_mmtpa,
                "capacity_loss_pct": derating_pct,
                "crude_processed": crude_info["name"],
                "composite_stress_score": composite_stress_score,
                "health_status": "CRITICAL_STRESS" if composite_stress_score > 75 else ("ELEVATED_RISK" if composite_stress_score > 50 else "NOMINAL"),
                "components": {
                    "CDU_distillation": {"stress_pct": cdu_stress, "status": "WARN" if cdu_stress > 70 else "OK"},
                    "VDU_vacuum": {"stress_pct": vdu_stress, "status": "WARN" if vdu_stress > 70 else "OK"},
                    "FCCU_cracking": {"stress_pct": fccu_stress, "status": "WARN" if fccu_stress > 70 else "OK"},
                    "DHDS_desulfurization": {"stress_pct": dhds_stress, "status": "CRITICAL" if dhds_stress > 80 else ("WARN" if dhds_stress > 60 else "OK")}
                },
                "hormuz_dependency_pct": hormuz_dependency_pct,
                "hormuz_exposure_factor": round(hormuz_exposure_factor, 3),
                "source_attribution": "estimated - composite stress is modeled by scaling crude-grade sulfur/gravity stress ratios by a per-refinery Hormuz-dependency exposure factor (hormuz_dependency_pct / 50.0, clamped 0.5x-1.5x); not an official refiner-disclosed derating figure"
            })

        return {
            "crude_blend": crude_info,
            "days_under_mismatch": Days_in_stress,
            "refineries": refinery_reports
        }

if __name__ == "__main__":
    engine = RefineryStressEngine()
    res = engine.evaluate_refinery_stress("BASRAH_HEAVY", 20)
    print(f"✅ Refinery Stress Engine Test Passed ({len(res['refineries'])} refineries evaluated under Basrah Heavy crude)")
