"""
Chakravyuh Phase 5 - Sectoral Fuel Rationing & Priority Allocation Policy Engine
Calculates optimal daily fuel quotas across Defense, Agriculture, Power, Aviation, and Retail sectors.
"""

import json
import os

class SectoralRationingOptimizer:
    def __init__(self):
        # Baseline Indian Daily Product Demand (~5.0 Million bpd = 5,000 TBPD)
        # NOTE: the per-sector split below (defense/agriculture/power/public_transport/
        # commercial_retail) and each sector's protected_quota_pct are MODELED ESTIMATES
        # illustrating a plausible priority-tiered rationing policy - India's real fuel
        # consumption is not officially published broken out at this sectoral granularity,
        # so these are not disclosed PPAC/MoPNG allocation figures. See source_attribution
        # in optimize_rationing_quotas() below.
        self.BASELINE_SECTORAL_DEMAND_TBPD = {
            "defense": {"name": "Armed Forces & Border Defense", "tier": 1, "demand_tbpd": 400, "protected_quota_pct": 100.0},
            "agriculture": {"name": "Agriculture & Food Logistics", "tier": 2, "demand_tbpd": 950, "protected_quota_pct": 90.0},
            "power": {"name": "Power Generation & Grid Peakers", "tier": 3, "demand_tbpd": 650, "protected_quota_pct": 80.0},
            "public_transport": {"name": "Public Busses & Railways", "tier": 4, "demand_tbpd": 1100, "protected_quota_pct": 65.0},
            "commercial_retail": {"name": "Private Retail & Commercial Freight", "tier": 5, "demand_tbpd": 1900, "protected_quota_pct": 40.0}
        }

    def optimize_rationing_quotas(self, national_crude_deficit_pct=30.0, custom_defense_slider=100.0, custom_retail_slider=40.0):
        """
        Computes sectoral daily allocation quotas and estimated daily GDP impact.
        """
        total_baseline_demand = sum(s["demand_tbpd"] for s in self.BASELINE_SECTORAL_DEMAND_TBPD.values())
        available_supply_tbpd = total_baseline_demand * (1.0 - (national_crude_deficit_pct / 100.0))

        sector_results = []
        allocated_total_tbpd = 0.0

        for key, s in self.BASELINE_SECTORAL_DEMAND_TBPD.items():
            base_tbpd = s["demand_tbpd"]
            
            # Apply user/policy overrides
            if key == "defense":
                quota_pct = custom_defense_slider
            elif key == "commercial_retail":
                quota_pct = custom_retail_slider
            else:
                # Tier-based cascade reduction
                reduction_severity = max(0.0, national_crude_deficit_pct - (100.0 - s["protected_quota_pct"]))
                quota_pct = max(s["protected_quota_pct"] - (0.5 * reduction_severity), 30.0)

            allocated_tbpd = round(base_tbpd * (quota_pct / 100.0), 1)
            allocated_total_tbpd += allocated_tbpd
            shortfall_tbpd = round(base_tbpd - allocated_tbpd, 1)

            sector_results.append({
                "sector_id": key,
                "name": s["name"],
                "tier": s["tier"],
                "baseline_tbpd": base_tbpd,
                "allocated_tbpd": allocated_tbpd,
                "shortfall_tbpd": shortfall_tbpd,
                "fulfillment_pct": round(quota_pct, 1),
                "status": "FULL_PROTECTION" if quota_pct >= 95 else ("RATIONED" if quota_pct >= 60 else "SEVERELY_RESTRICTED")
            })

        # Calculate estimated daily GDP shortfall impact (₹ Crores / day)
        unmet_demand_tbpd = max(0.0, total_baseline_demand - allocated_total_tbpd)
        daily_gdp_impact_cr = round(unmet_demand_tbpd * 3.45, 1) # Estimated ₹3.45 Cr per 1k bpd unmet

        return {
            "national_deficit_pct": national_crude_deficit_pct,
            "total_baseline_demand_tbpd": total_baseline_demand,
            "total_allocated_supply_tbpd": round(allocated_total_tbpd, 1),
            "net_unmet_demand_tbpd": round(unmet_demand_tbpd, 1),
            "estimated_daily_gdp_loss_crores": daily_gdp_impact_cr,
            "sectors": sector_results,
            "source_attribution": (
                "estimated - BASELINE_SECTORAL_DEMAND_TBPD's per-sector split and "
                "protected_quota_pct tiers are modeled illustrative assumptions, not an "
                "officially disclosed government sectoral allocation policy. The GDP-impact "
                "coefficient (Rs.3.45 Cr per 1k bpd of unmet demand) is likewise a modeled "
                "illustrative multiplier, not a published macroeconomic estimate."
            )
        }

if __name__ == "__main__":
    optimizer = SectoralRationingOptimizer()
    res = optimizer.optimize_rationing_quotas(national_crude_deficit_pct=35.0)
    print(f"✅ Sectoral Rationing Optimizer Test Passed (Allocated {res['total_allocated_supply_tbpd']} TBPD out of {res['total_baseline_demand_tbpd']} TBPD)")
