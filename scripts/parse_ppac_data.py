"""
Chakravyuh PPAC Data Ingestion Script
Actually extracts refinery installed-capacity figures from the real downloaded
data/ppac_ready_reckoner.pdf (PPAC "Ready Reckoner" FY2022-23 edition, Table 4.1:
"Refineries: Installed capacity and crude oil processing") and updates data/seed.json.

Requires the system `pdftotext` binary (poppler-utils) - no PDF-parsing pip package
is used, to avoid a dependency this environment may not have network access to install.
"""

import os
import re
import json
import subprocess

PDF_RELATIVE_PATH = "../data/ppac_ready_reckoner.pdf"
SEED_RELATIVE_PATH = "../data/seed.json"
TABLE_SOURCE = "PPAC Ready Reckoner FY2022-23, Table 4.1 (Installed capacity, MMTPA, as of 01.04.2023)"

# Maps seed.json refinery ids to the label(s) used for their row(s) in Table 4.1.
# Most refineries are a single row; Jamnagar is split DTA+SEZ, Mumbai has two
# separate rows (HPCL's Mumbai unit and BPCL's Mumbai unit) that seed.json combines.
ROW_LABELS = {
    "ref_jamnagar": ["RIL-Jamnagar"],  # 2 rows: (DTA) + (SEZ), summed
    "ref_vadinar": ["NEL*-Vadinar"],
    "ref_mangaluru": ["MRPL-"],  # label wraps to "Mangalore" on the next line
    "ref_kochi": ["Kochi"],
    "ref_mumbai": ["Mumbai"],  # 2 rows: HPCL's + BPCL's Mumbai refineries, summed
    "ref_paradip": ["Paradip"],
    # ref_vskp intentionally excluded: the FY2022-23 PDF snapshot (11.0 MMTPA) predates
    # HPCL's Jan-2026 LC-Max Residue Upgradation Facility commissioning that took it to
    # 15.0 MMTPA (verified via HPCL/press coverage, not this PDF) - see seed.json's own
    # source_attribution for that entry.
}


def extract_table_text(pdf_path):
    """Runs pdftotext -layout on the real PDF and returns the Table 4.1 section only."""
    result = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, check=True
    )
    full_text = result.stdout
    match = re.search(
        r"Table 4\.1 : Refineries.*?(?=All India\s+[\d.]+)",
        full_text, re.DOTALL
    )
    if not match:
        raise ValueError("Could not locate Table 4.1 in extracted PDF text - report layout may have changed.")
    return match.group(0)


def extract_capacity(table_text, label):
    """
    Finds a row (or wrapped multi-line row) starting with `label` and returns the
    01.04.2023 installed-capacity column value (the second of the two leading
    MMTPA figures on that row).
    """
    values = []
    lines = table_text.split("\n")
    for i, line in enumerate(lines):
        if label not in line:
            continue
        # The two installed-capacity numbers are either on this same line, or (for
        # wrapped labels like "RIL-Jamnagar" / "MRPL-") on the next line.
        search_line = line if re.search(r"\d", line) else lines[i + 1] if i + 1 < len(lines) else ""
        nums = re.findall(r"\d+\.\d+", search_line)
        if len(nums) >= 2:
            values.append(float(nums[1]))  # column 2 = 01.04.2023
    return values


def update_seed_from_ppac():
    script_dir = os.path.dirname(__file__)
    pdf_path = os.path.join(script_dir, PDF_RELATIVE_PATH)
    seed_path = os.path.join(script_dir, SEED_RELATIVE_PATH)

    if not os.path.exists(pdf_path):
        print(f"Real PPAC PDF not found at {pdf_path} - run the download step first, not skipping to hardcoded values.")
        return
    if not os.path.exists(seed_path):
        print(f"Seed file not found at {seed_path}")
        return

    table_text = extract_table_text(pdf_path)

    extracted = {}
    for ref_id, labels in ROW_LABELS.items():
        all_values = []
        for label in labels:
            all_values.extend(extract_capacity(table_text, label))
        if not all_values:
            print(f"WARNING: could not extract a value for {ref_id} (label(s) {labels}) - leaving seed.json untouched for it.")
            continue
        extracted[ref_id] = round(sum(all_values), 1)

    with open(seed_path, "r") as f:
        seed_data = json.load(f)

    updated_count = 0
    for ref in seed_data.get("refineries", []):
        ref_id = ref["id"]
        if ref_id in extracted:
            ref["capacity_mmtpa"] = extracted[ref_id]
            ref["source_attribution"] = TABLE_SOURCE
            updated_count += 1

    seed_data["meta"]["ppac_verified"] = True
    seed_data["meta"]["last_ppac_sync"] = "2026-07-21"

    with open(seed_path, "w") as f:
        json.dump(seed_data, f, indent=2)
        f.write("\n")

    print(f"Extracted from real PDF: {extracted}")
    print(f"Updated {updated_count} refinery node baselines in data/seed.json from the actual downloaded PPAC Ready Reckoner PDF.")


if __name__ == "__main__":
    update_seed_from_ppac()
