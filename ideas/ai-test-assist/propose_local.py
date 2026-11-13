"""Request a synthetic declarative plan from an explicitly selected local Ollama."""
import argparse
import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


PROMPT = """Return a JSON object with a cases array containing exactly three objects. Each object has exactly two string keys: scenario and expected.
The three scenario strings are valid, missing-case, and mismatch. Use each exactly once.
The expected string for valid is synthetic-echo. The expected string for missing-case is REJECTED_MISSING_IDENTITY. The expected string for mismatch is REVIEW_REQUESTED.
Every scenario and expected value must be a single string, never a list of alternatives. Return JSON only; no code or patient data."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("redirect refused")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--endpoint", required=True)
    p.add_argument("--model", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--protocol", choices=("ollama", "openai-compatible"), default="ollama")
    args = p.parse_args()
    parsed = urllib.parse.urlsplit(args.endpoint)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.username or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment or not parsed.port:
        raise ValueError("only explicit 127.0.0.1 HTTP endpoints without paths or credentials are accepted")
    if args.protocol == "ollama":
        payload = {"model": args.model, "prompt": PROMPT, "format": "json", "stream": False, "keep_alive": 0,
                   "options": {"num_ctx": 2048, "num_predict": 256, "num_thread": 4, "temperature": 0}}
        route = "/api/generate"
    else:
        schema = {"type": "object", "properties": {"cases": {"type": "array", "minItems": 3, "maxItems": 3,
                  "items": {"type": "object", "properties": {"scenario": {"enum": ["valid", "missing-case", "mismatch"]},
                  "expected": {"enum": ["synthetic-echo", "REJECTED_MISSING_IDENTITY", "REVIEW_REQUESTED"]}},
                  "required": ["scenario", "expected"], "additionalProperties": False}}}, "required": ["cases"], "additionalProperties": False}
        payload = {"model": args.model, "messages": [{"role": "user", "content": PROMPT}], "stream": False,
                   "temperature": 0, "max_tokens": 384,
                   "response_format": {"type": "json_schema", "json_schema": {"name": "synthetic_plan", "schema": schema}}}
        route = "/v1/chat/completions"
    body = json.dumps(payload).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{parsed.port}{route}", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect()).open(req, timeout=180) as response:
        raw = response.read(65537)
    if len(raw) > 65536:
        raise ValueError("provider response too large")
    result = json.loads(raw)
    answer = result.get("response", "") if args.protocol == "ollama" else result["choices"][0]["message"]["content"]
    proposal = json.loads(answer)
    data = (json.dumps(proposal, indent=2) + "\n").encode()
    with Path(args.output).open("xb") as out:
        out.write(data)
    print(json.dumps({"output": args.output, "sha256": hashlib.sha256(data).hexdigest(), "model": args.model, "status": "PROPOSED_NOT_REVIEWED"}))


if __name__ == "__main__":
    main()
