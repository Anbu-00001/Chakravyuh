"""
Chakravyuh End-to-End System Test Suite
Verifies all 5 Layers of the Energy Supply Chain Resilience War-Room
"""

import urllib.request
import json
import time

INGEST_URL = "http://localhost:5000"
SIMULATE_URL = "http://localhost:8000"

def test_endpoint(name, url, method="GET", payload=None):
    print(f"Testing {name} ({url})...", end=" ")
    try:
        data_bytes = json.dumps(payload).encode("utf-8") if payload else None
        headers = {"Content-Type": "application/json"} if payload else {}
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=10) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print("✅ PASSED")
            return res_data
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return None

def run_suite():
    print("=" * 65)
    print("  CHAKRAVYUH END-TO-END AUTOMATED TEST SUITE")
    print("=" * 65)

    # Layer 1 - SENSE
    test_endpoint("Layer 1: Ingest Health", f"{INGEST_URL}/api/health")
    test_endpoint("Layer 1: Vessel Tracking", f"{INGEST_URL}/api/ships")
    test_endpoint("Layer 1: Live News Ingestion", f"{INGEST_URL}/api/news")

    # Layer 2 - SIMULATE
    test_endpoint("Layer 2: Baseline Config", f"{SIMULATE_URL}/api/simulate/baseline")
    test_endpoint("Layer 2: Topology Graph", f"{SIMULATE_URL}/api/simulate/topology?severity_pct=65")
    test_endpoint("Layer 2: Causal Shock Cascade", f"{SIMULATE_URL}/api/simulate", method="POST", payload={"chokepoint": "chk_hormuz", "severity_pct": 65})
    test_endpoint("Layer 2: Monte Carlo Simulation", f"{SIMULATE_URL}/api/simulate/montecarlo?chokepoint=chk_hormuz&severity_pct=65&runs=50")

    # Layer 3 - STRATEGIZE
    test_endpoint("Layer 3: Agentic Playbook Generation", f"{SIMULATE_URL}/api/strategize", method="POST", payload={"chokepoint": "chk_hormuz", "severity_pct": 65})

    # Layer 4 - ADVERSARIAL WARGAME
    test_endpoint("Layer 4: Red-Team Escalation Attack", f"{SIMULATE_URL}/api/wargame/redteam", method="POST", payload={"chokepoint": "chk_hormuz", "intensity": "HIGH"})

    # Layer 5 - OPERATIONAL RESILIENCE
    test_endpoint("Layer 5: Refinery SCADA Stress", f"{SIMULATE_URL}/api/simulate/refinery-stress", method="POST", payload={"crude_grade": "BASRAH_HEAVY", "days_in_stress": 20})
    test_endpoint("Layer 5: Priority Fuel Rationing", f"{SIMULATE_URL}/api/rationing/optimize", method="POST", payload={"national_deficit_pct": 35.0, "defense_slider": 100.0, "retail_slider": 40.0})

    print("=" * 65)

if __name__ == "__main__":
    run_suite()
