"""Check exact reviewed plan bytes and export only finite synthetic scenarios."""
import argparse
import hashlib
import json
from pathlib import Path


def validate(data, digest):
    if len(data) > 65536 or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError("plan does not match reviewed bytes or exceeds size limit")
    plan = json.loads(data)
    if not isinstance(plan, dict) or set(plan) != {"cases"} or not isinstance(plan["cases"], list) or not 1 <= len(plan["cases"]) <= 10:
        raise ValueError("invalid case list")
    seen = set()
    for case in plan["cases"]:
        if not isinstance(case, dict) or set(case) != {"scenario", "expected"}:
            raise ValueError("unknown case fields")
        if not isinstance(case["scenario"], str) or case["scenario"] not in {"valid", "missing-case", "mismatch"} or case["scenario"] in seen:
            raise ValueError("unknown or duplicate scenario")
        if not isinstance(case["expected"], str) or case["expected"] not in {"synthetic-echo", "REJECTED_MISSING_IDENTITY", "REVIEW_REQUESTED"}:
            raise ValueError("unknown expected outcome")
        seen.add(case["scenario"])
    if seen != {"valid", "missing-case", "mismatch"}:
        raise ValueError("plan must cover all three required synthetic scenarios")
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--reviewed-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    with Path(args.plan).open("rb") as source:
        plan = validate(source.read(65537), args.reviewed_sha256)
    with Path(args.output).open("x", encoding="utf-8", newline="\n") as out:
        json.dump(plan, out, indent=2)
        out.write("\n")
    print("Reviewed synthetic plan exported; no generated code executed.")


if __name__ == "__main__":
    main()
