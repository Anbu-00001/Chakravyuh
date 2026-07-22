"""
Chakravyuh Validation Module - Hormuz Crisis Backtest
Validates Layer 2's causal graph engine (EnergySupplyChainGraph.simulate_shock) against
the REAL 2026 Strait of Hormuz crisis (2026-02-28 -> 2026-07-20) by re-running the engine
across a piecewise severity_pct timeline that approximates the real event's shape, then
pairing the resulting trajectory against fact-checked ground-truth anchors.

This is a QUALITATIVE shape check, not a quantitative forecast validation -- see the
"methodology_note" field returned by run_backtest() for the honesty caveat this whole
module is built around.
"""

import datetime

from simulate.graph_engine import EnergySupplyChainGraph


class HormuzCrisisBacktest:
    """
    Re-anchors EnergySupplyChainGraph.simulate_shock() across a hand-built, clearly-labeled
    severity_pct timeline spanning the real 2026 Hormuz crisis, then reports the resulting
    trajectory alongside verified ground-truth anchors for side-by-side comparison.
    """

    # Mapping rule used throughout this module: severity_pct fed into simulate_shock() is
    # treated as "% of normal Hormuz throughput capacity lost". Where the real event gives
    # us a directly reported "% of normal tanker transit volume lost", that figure is used
    # as severity_pct almost directly (transit volume is the closest public proxy we have
    # for throughput capacity). Where no transit-volume figure exists for a phase,
    # severity_pct is this module's own reasoned estimate, anchored to the qualitative
    # event description bracketing it -- NOT a measurement. Every phase is labeled with
    # which case applies via "basis": "DIRECT_PROXY" or "ESTIMATE".
    PHASES = [
        {
            "id": "initial_shock",
            "start": "2026-02-28",
            "end": "2026-03-01",
            "severity_pct": 35.0,
            "basis": "ESTIMATE",
            "rationale": "US/Israeli strikes on Iran begin; IRGC starts boarding/attacking merchant "
                         "ships. Disruption is underway but before the mass carrier suspension -- "
                         "estimated as a moderate initial shock, below the ~70% transit drop reported "
                         "days later."
        },
        {
            "id": "closure_declared",
            "start": "2026-03-02",
            "end": "2026-03-07",
            "severity_pct": 70.0,
            "basis": "DIRECT_PROXY",
            "rationale": "IRGC declares the Strait closed; major carriers suspend transit. The "
                         "reported ~70% immediate drop in tanker traffic is used directly as "
                         "severity_pct (transit-volume-lost as a proxy for throughput-capacity-lost)."
        },
        {
            "id": "peak_shock",
            "start": "2026-03-08",
            "end": "2026-03-09",
            "severity_pct": 92.0,
            "basis": "ESTIMATE",
            "rationale": "Brent breaks $100/bbl then peaks at $126/bbl -- the largest monthly "
                         "oil-price jump on record. No independent transit-volume figure exists for "
                         "these two days; estimated as near-total effective closure, since war-risk "
                         "insurance withdrawal and broader carrier avoidance plausibly compound the "
                         "raw ~70% drop into near-total avoidance by the largest operators at the "
                         "price-shock peak."
        },
        {
            "id": "sustained_high_severity",
            "start": "2026-03-10",
            "end": "2026-06-16",
            "severity_pct": 85.0,
            "basis": "ESTIMATE",
            "rationale": "The single largest reasoned-estimate simplification in this module: ~99 "
                         "days held flat at high severity because no finer-grained daily transit or "
                         "price anchor exists between the March peak and the June de-escalation "
                         "memorandum. The real event almost certainly fluctuated within this window; "
                         "this module does not claim to know that finer shape, only that conditions "
                         "stayed 'sustained high' per the verified anchors bracketing it."
        },
        {
            "id": "deescalation_dip",
            "start": "2026-06-17",
            "end": "2026-06-19",
            "severity_pct": 20.0,
            "basis": "ESTIMATE",
            "rationale": "Temporary US-Iran de-escalation memorandum; traffic surges back and Brent "
                         "begins falling. No exact transit-volume figure exists for this window; "
                         "estimated as a sharp partial normalization."
        },
        {
            "id": "post_deescalation_low",
            "start": "2026-06-20",
            "end": "2026-07-07",
            "severity_pct": 12.0,
            "basis": "ESTIMATE",
            "rationale": "Brent falls below $70/bbl by 2026-07-01, consistent with transit having "
                         "largely normalized. Estimated as low residual severity rather than zero, "
                         "since the underlying conflict had not formally resolved."
        },
        {
            "id": "re_escalation_shock",
            "start": "2026-07-08",
            "end": "2026-07-11",
            "severity_pct": 60.0,
            "basis": "ESTIMATE",
            "rationale": "Interim truce breaks down; fresh US strikes on Iran resume and Iran "
                         "redeclares closure. Estimated as a sharp initial jump ramping toward the "
                         "directly observed 2026-07-12 transit figure below."
        },
        {
            "id": "re_escalation_peak",
            "start": "2026-07-12",
            "end": "2026-07-20",
            "severity_pct": 89.0,
            "basis": "DIRECT_PROXY",
            "rationale": "Commercial transit measured at ~11% of pre-crisis volume (~10 vessels/day "
                         "vs. an ~88/day baseline) on 2026-07-12, consistent with Brent's ~14% jump "
                         "into the $84-86/bbl range. 100% - 11% = 89% is used directly as severity_pct, "
                         "held through 2026-07-20 (this module's 'today', per the verified anchor set)."
        },
    ]

    # Mitigation flags applied uniformly across every phase. This reflects two things India
    # actually did in the real event -- diversify sourcing (27 -> 41 supplier countries, see
    # data/seed.json "diversified_source_countries") and draw down strategic reserves --
    # approximated here with the engine's existing "cape_reroute" and "spr_release" flags.
    # This is also a labeled modeling choice, not a measurement: run fully unmitigated, the
    # engine would show reserves crashing toward zero, which does not match the real
    # outcome (India explicitly avoided formal fuel rationing, per the 2026-03-27 anchor).
    MITIGATIONS_APPLIED = ["cape_reroute", "spr_release"]

    RESERVE_NODES = ["spr_vskp", "spr_mglr", "spr_pdr", "node_commercial_stock"]

    # Verified ground-truth anchors for the real 2026 Strait of Hormuz crisis, fact-checked
    # against public reporting (Wikipedia / CNBC / EIA / ORF) as of 2026-07-20. These are
    # historical facts, not model outputs -- kept separate from PHASES above.
    GROUND_TRUTH_ANCHORS = [
        {
            "date": "2026-02-28",
            "event": "Crisis begins: US/Israeli strikes on Iran; IRGC starts boarding/attacking "
                     "merchant ships in the Strait of Hormuz.",
            "metric": None, "value": None, "unit": None
        },
        {
            "date": "2026-03-02",
            "event": "IRGC declares the Strait closed; major carriers suspend transit. Traffic "
                     "dropped ~70% almost immediately.",
            "metric": "hormuz_transit_loss_pct", "value": 70.0,
            "unit": "% of normal tanker transit lost"
        },
        {
            "date": "2026-03-08",
            "event": "Brent crude surpasses $100/bbl for the first time in 4 years.",
            "metric": "brent_usd_per_bbl", "value": 100.0, "unit": "USD/bbl"
        },
        {
            "date": "2026-03-08/09",
            "event": "Brent hits $126/bbl (peak) -- the largest monthly oil-price jump on record.",
            "metric": "brent_usd_per_bbl", "value": 126.0, "unit": "USD/bbl"
        },
        {
            "date": "2026-03",
            "event": "Indian rupee weakens to ~Rs92.40/USD at its worst point.",
            "metric": "inr_per_usd", "value": 92.40, "unit": "INR/USD"
        },
        {
            "date": "2026-03-27",
            "event": "India cuts petrol/diesel excise duty by Rs10/litre (cost ~Rs1.7 lakh crore) "
                     "as a reactive fiscal shock-absorber; India explicitly avoided formal fuel "
                     "rationing.",
            "metric": "excise_duty_cut_inr_per_litre", "value": 10.0, "unit": "INR/litre"
        },
        {
            "date": "2026-06-17/19",
            "event": "Temporary US-Iran de-escalation memorandum; traffic surges back.",
            "metric": None, "value": None, "unit": None
        },
        {
            "date": "2026-07-01",
            "event": "Brent falls below $70/bbl.",
            "metric": "brent_usd_per_bbl", "value": 70.0, "unit": "USD/bbl (ceiling, fell below)"
        },
        {
            "date": "2026-07-08/14",
            "event": "Interim truce breaks down; fresh US strikes on Iran resume; Iran redeclares "
                     "closure. Brent jumps ~14% into the $84-86/bbl range.",
            "metric": "brent_usd_per_bbl", "value": 85.0, "unit": "USD/bbl (approx. range midpoint)"
        },
        {
            "date": "2026-07-12",
            "event": "Commercial transit at ~11% of pre-crisis volume -- about 10 vessels/day "
                     "against a ~88/day normal baseline.",
            "metric": "hormuz_transit_pct_of_normal", "value": 11.0,
            "unit": "% of normal tanker transit remaining"
        },
        {
            "date": "pre-crisis -> mid-2026",
            "event": "India's crude supplier count grew from 27 countries pre-crisis to 41 by "
                     "mid-2026, a diversification response to the crisis.",
            "metric": "diversified_source_countries", "value": 41, "unit": "count"
        },
    ]

    def __init__(self):
        # Owns its own EnergySupplyChainGraph instance (rather than reusing a shared one)
        # since run_backtest() mutates reserve node state between phases to re-anchor
        # depletion across the stitched timeline -- that mutation must not leak into any
        # shared engine instance used by other live endpoints.
        self.engine = EnergySupplyChainGraph()

    @staticmethod
    def _parse_date(date_str):
        return datetime.date.fromisoformat(date_str)

    def _reanchor_reserves(self, new_total_barrels):
        """
        Rescales every reserve node's current_barrels so their sum matches
        new_total_barrels, preserving each node's relative share. Used to carry reserve
        depletion across phase boundaries, since simulate_shock() itself has no state
        that persists between calls.
        """
        old_total = sum(self.engine.G.nodes[n]["current_barrels"] for n in self.RESERVE_NODES)
        if old_total <= 0:
            return
        ratio = max(0.0, new_total_barrels) / old_total
        for n in self.RESERVE_NODES:
            self.engine.G.nodes[n]["current_barrels"] *= ratio

    def run_backtest(self):
        """
        Runs simulate_shock() once per phase in PHASES (each phase's duration_days derived
        from its start/end dates), re-anchoring starting reserves between phases so
        depletion carries across the full ~143-day real-world window. Returns the stitched
        day-by-day trajectory alongside the verified ground-truth anchors.

        Rebuilds self.engine fresh at the top of every call: run_backtest() progressively
        mutates reserve node state as it walks the phases, so without this reset a second
        call on the same (e.g. process-lifetime singleton) instance would silently continue
        from the first call's depleted end-state instead of the pristine baseline.
        """
        self.engine = EnergySupplyChainGraph()
        daily_demand = self.engine.G.nodes["demand_national"]["bpd"]
        stitched_trajectory = []
        cumulative_day = 0

        for phase in self.PHASES:
            start_date = self._parse_date(phase["start"])
            end_date = self._parse_date(phase["end"])
            duration_days = (end_date - start_date).days + 1

            result = self.engine.simulate_shock(
                chokepoint_id="chk_hormuz",
                severity_pct=phase["severity_pct"],
                duration_days=duration_days,
                mitigation=self.MITIGATIONS_APPLIED
            )

            for point in result["trajectory"]:
                cumulative_day += 1
                calendar_date = start_date + datetime.timedelta(days=point["day"] - 1)
                stitched_trajectory.append({
                    "cumulative_day": cumulative_day,
                    "calendar_date": calendar_date.isoformat(),
                    "phase": phase["id"],
                    "severity_pct_input": phase["severity_pct"],
                    "days_of_cover": point["days_of_cover"],
                    "inbound_flow_bpd": point["inbound_flow_bpd"],
                    "daily_deficit_bpd": point["daily_deficit_bpd"],
                    "refinery_throughput_pct": point["refinery_throughput_pct"],
                    "retail_price_impact_inr": point["retail_price_impact_inr"],
                    "uncertainty_band": point["uncertainty_band"]
                })

            # Re-anchor reserves into the next phase using this phase's ending buffer, so
            # depletion (or lack of it) carries forward instead of resetting each call.
            ending_barrels = stitched_trajectory[-1]["days_of_cover"] * daily_demand
            self._reanchor_reserves(ending_barrels)

        return {
            "window": {"start": self.PHASES[0]["start"], "end": self.PHASES[-1]["end"]},
            "simulated_trajectory": stitched_trajectory,
            "ground_truth_anchors": self.GROUND_TRUTH_ANCHORS,
            "phase_definitions": self.PHASES,
            "methodology_note": (
                "This is a QUALITATIVE SHAPE CHECK, not a quantitative forecast validation. "
                "severity_pct inputs for the real 2026 Hormuz crisis are a REASONED ESTIMATE, not a "
                "measurement -- nobody measures 'severity_pct' in the real world. Two of the eight "
                "phases ('closure_declared' and 're_escalation_peak') use a directly-reported "
                "transit-volume figure as a direct proxy for severity_pct; every other phase is this "
                "module's own estimate, anchored to the qualitative event description bracketing it "
                "and explicitly labeled via each phase's 'basis' and 'rationale' fields in "
                "phase_definitions. The ~99-day 'sustained_high_severity' phase in particular holds "
                "severity flat for lack of any finer-grained daily anchor and is the single largest "
                "simplification here. The correct claim for a jury is: 'the engine's qualitative shape "
                "-- rapid depletion during the Feb-Mar escalation, a de-escalation plateau in mid-June, "
                "and renewed shock in early July -- tracks the qualitative shape of the real event.' "
                "It is NOT a claim that this engine predicted the crisis, and it is NOT a claim that "
                "its day-by-day buffer or price-impact numbers quantitatively match real-world Brent "
                "prices, INR depreciation, or actual Indian reserve drawdowns. Mitigation flags "
                "('cape_reroute', 'spr_release') are applied uniformly across all phases as a labeled "
                "modeling choice reflecting India's real diversification/reserve response -- not a "
                "measured input either."
            )
        }


if __name__ == "__main__":
    engine = HormuzCrisisBacktest()
    res = engine.run_backtest()
    print(f"Hormuz Crisis Backtest: {len(res['simulated_trajectory'])} stitched days across "
          f"{len(res['phase_definitions'])} phases, {len(res['ground_truth_anchors'])} "
          f"ground-truth anchors ({res['window']['start']} -> {res['window']['end']})")
