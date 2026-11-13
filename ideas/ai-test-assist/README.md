# Local declarative test-plan experiment

This optional prototype explores a small review-and-execution boundary related to [DPI-I-439](https://ideas.intersystems.com/ideas/DPI-I-439). An AI assistant can suggest a JSON plan, a reviewer inspects the exact bytes and supplies their SHA-256, and `plan_runner.py` evaluates only its fixed presence/absence assertions against a local OpenAPI document. It rejects unreviewed bytes, unknown fields and unsupported actions; it never executes generated code or connects to IRIS, an AI provider, or a network. The included synthetic plan was authored by the assistant during development and reviewed locally; it is not evidence of an integrated automated AI test generator.

Example (replace the paths and hash with the reviewed local inputs):

```text
python plan_runner.py --plan synthetic-plan.json --reviewed-sha256 <sha256> --spec <local-synthetic-openapi.json>
```

`propose_local.py` can ask an explicitly selected loopback model to propose three synthetic metadata scenarios; it sends no patient data. `review_metadata_plan.py` checks the exact reviewed bytes and limits execution to three predefined scenarios. In a bounded local witness, the model proposed an incorrect mismatch expectation: IRIS correctly returned review requested and the proposed test failed. The expectation was then explicitly corrected in a separate reviewed file and the three synthetic cases passed. This is not proof of native agent or general provider reliability.

The hash binds the plan to the bytes a reviewer inspected; it does not authenticate the reviewer or prove that a review occurred. The runner is only a deterministic guard around test proposals. Successful tests do not validate FHIR resources, permissions, clinical correctness or coverage. A production AI-powered workflow would require a qualified provider connection, review UX, provenance, security and isolated test execution against actual IRIS changes.
