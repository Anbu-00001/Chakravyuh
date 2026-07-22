"""
Chakravyuh Phase 4 - AI Red-Team Disruptor Agent
Simulates multi-vector simultaneous escalation shocks against energy supply chains.
"""

import os
import json
from simulate.regional_graph import RegionalIndoPacificGraph

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class RedTeamDisruptorAgent:
    def __init__(self):
        self.regional_engine = RegionalIndoPacificGraph()
        self.gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.groq_key = os.environ.get("GROQ_API_KEY")

    def generate_escalation_attack(self, base_shock="chk_hormuz", intensity="HIGH"):
        """
        AI Red-Team Disruptor: Formulates multi-vector attack scenarios.
        """
        attack_vectors = [
            {
                "id": "hormuz_blockade",
                "target": "Strait of Hormuz",
                "severity_bump_pct": 25.0,
                "description": "IRGC Fast-attack craft deployment enforcing total vessel halt in the Strait of Hormuz."
            },
            {
                "id": "bab_el_mandeb_mines",
                "target": "Bab-el-Mandeb Chokepoint",
                "severity_bump_pct": 15.0,
                "description": "Naval sea mine proliferation forcing Cape of Good Hope rerouting with +14 day delay."
            },
            {
                "id": "jamnagar_scada_disruption",
                "target": "Sikka / Jamnagar Refinery",
                "severity_bump_pct": 20.0,
                "description": "Industrial SCADA malware disruption cutting West Coast refining throughput by 400,000 bpd."
            }
        ]

        # Intensity -> multiplier applied to the attack vectors' average severity_bump_pct
        # (see below). This replaces the old binary `30.0 if intensity == "HIGH" else 15.0`,
        # which silently collapsed the UI's MEDIUM and CRITICAL buttons onto the exact same
        # fallback branch (both produced composite_severity_pct == 80.0, while CRITICAL should
        # clearly read worse than MEDIUM). All three UI-facing threat levels now get their own
        # entry, plus a sane default (HIGH's multiplier) for any unrecognized string.
        #
        # NOTE on the HIGH/CRITICAL multipliers: CRITICAL's multiplier is set so it lands
        # exactly on the min(95.0, ...) ceiling below - the same ceiling the old code's single
        # "HIGH" branch used to saturate (65.0 + 30.0 == 95.0). HIGH's multiplier is
        # deliberately kept a bit lower than that "old HIGH" value so CRITICAL can sit clearly
        # above HIGH while both still respect the same 95.0 cap - if HIGH also saturated the
        # cap, CRITICAL would have nowhere higher to go and the two tiers would tie.
        INTENSITY_VECTOR_MULTIPLIER = {
            "MEDIUM": 0.6,
            "HIGH": 1.1,
            "CRITICAL": 1.5,
        }
        intensity_multiplier = INTENSITY_VECTOR_MULTIPLIER.get(intensity, INTENSITY_VECTOR_MULTIPLIER["HIGH"])

        # Wire the displayed attack_vectors into the displayed composite_severity_pct instead
        # of leaving them cosmetically adjacent but mathematically disconnected (previously the
        # three vectors were shown right next to the composite badge implying they composed
        # into it, but the composite never referenced them at all). The composite is now the
        # base_shock's own 65.0 baseline severity plus an intensity-scaled contribution derived
        # from the average severity_bump_pct across the active attack vectors, still capped at
        # a sane 95.0 ceiling.
        avg_vector_severity_bump = sum(v["severity_bump_pct"] for v in attack_vectors) / len(attack_vectors)
        composite_severity = min(95.0, 65.0 + intensity_multiplier * avg_vector_severity_bump)

        # Execute 100-run Monte Carlo simulation under Red-Team composite shock
        mc_results = self.regional_engine.run_monte_carlo_simulation(
            chokepoint_id=base_shock,
            severity_pct=composite_severity,
            runs=100
        )

        return {
            "threat_id": "RED_TEAM_COMPOUND_ALPHA",
            "intensity": intensity,
            "composite_severity_pct": composite_severity,
            "attack_vectors": attack_vectors,
            "p10_optimistic_buffer": mc_results["p10_day_30"],
            "p50_expected_buffer": mc_results["p50_day_30"],
            "p90_worst_case_buffer": mc_results["p90_day_30"],
            "trajectory": mc_results["trajectory"],
            "source_attribution": (
                "estimated - composite_severity_pct and attack_vectors are modeled/illustrative "
                "AI red-team scenario inputs (a hypothesized compound-shock formulation), not "
                "measured intelligence; composite_severity_pct is derived from the base_shock's "
                "65.0 baseline severity plus an intensity-scaled average of the attack_vectors' "
                "severity_bump_pct figures, capped at 95.0"
            )
        }
