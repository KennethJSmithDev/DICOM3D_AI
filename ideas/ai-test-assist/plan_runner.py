"""Run a reviewed, declarative synthetic OpenAPI test plan; never execute plan code."""
import argparse
import hashlib
import json
import pathlib
import sys

MAX_BYTES = 64 * 1024
ALLOWED_METHODS = {"get", "post", "put", "patch", "delete"}
ALLOWED_ASSERTIONS = {"operation-present", "operation-absent"}


def read_plan(path, approved_hash):
    with pathlib.Path(path).open("rb") as stream:
        data = stream.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES or hashlib.sha256(data).hexdigest() != approved_hash:
        raise ValueError("Plan exceeds limit or does not match reviewed SHA-256")
    plan = json.loads(data)
    if not isinstance(plan, dict) or set(plan) != {"cases"} or not isinstance(plan["cases"], list) or not 1 <= len(plan["cases"]) <= 20:
        raise ValueError("Expected one to twenty declarative cases")
    seen = set()
    for case in plan["cases"]:
        if not isinstance(case, dict) or set(case) != {"id", "assertion", "path", "method"}:
            raise ValueError("Unsupported case fields")
        if not isinstance(case["id"], str) or not case["id"] or len(case["id"]) > 80 or case["id"] in seen:
            raise ValueError("Invalid or duplicate case ID")
        seen.add(case["id"])
        if case["assertion"] not in ALLOWED_ASSERTIONS or case["method"] not in ALLOWED_METHODS:
            raise ValueError("Unsupported assertion or method")
        if not isinstance(case["path"], str) or not case["path"].startswith("/") or len(case["path"]) > 200:
            raise ValueError("Invalid path")
    return plan


def evaluate(plan, spec):
    if not isinstance(spec, dict):
        raise ValueError("OpenAPI document must be an object")
    paths = spec.get("paths", {})
    if not isinstance(paths, dict):
        raise ValueError("OpenAPI paths must be an object")
    results = []
    for case in plan["cases"]:
        item = paths.get(case["path"], {})
        present = isinstance(item, dict) and case["method"] in item
        passed = present if case["assertion"] == "operation-present" else not present
        results.append({"id": case["id"], "pass": passed})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--reviewed-sha256", required=True)
    parser.add_argument("--spec", required=True)
    args = parser.parse_args()
    try:
        plan = read_plan(args.plan, args.reviewed_sha256)
        with pathlib.Path(args.spec).open("rb") as stream:
            spec_data = stream.read(20 * 1024 * 1024 + 1)
        if len(spec_data) > 20 * 1024 * 1024:
            raise ValueError("OpenAPI document exceeds limit")
        results = evaluate(plan, json.loads(spec_data))
        print(json.dumps({"status": "PASS" if all(x["pass"] for x in results) else "FAIL", "results": results}))
        return 0 if all(x["pass"] for x in results) else 1
    except (ValueError, OSError, TypeError) as exc:
        print(json.dumps({"status": "REFUSED", "reason": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
