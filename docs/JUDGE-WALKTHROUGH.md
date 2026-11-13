# DICOM3D_AI — judge walkthrough

## What the project demonstrates

DICOM3D_AI connects a public-research imaging finding to a native InterSystems IRIS AI Hub workflow. An Interoperability production receives a request; a native `%AI.Agent` uses restricted FHIR R5 evidence tools; a validator checks the returned structure identity and exact citations; and the viewer can select the corresponding lesion. A conflicting synthetic CT/SEG identity takes a review-request path instead of being presented as a verified finding.

This is a research prototype. The historical native execution and the browser-only simulation are different demonstrations; neither establishes clinical validity. Intermittent model failures and incomplete repeatability remain disclosed in the [tested scope and limitations](https://github.com/KennethJSmithDev/DICOM3D_AI/blob/82996e5db4806ed0d413642b152f74459d78ae83/contest/build154/README.md#tested-scope-and-known-limitations).

## 1. Explore immediately: simulated Safe Demo

Open the [interactive Safe Demo](https://kennethjsmithdev.github.io/DICOM3D_AI/) in a WebGPU-capable browser. Explore the generalized reference anatomy, then open the public research CT example. The controls labeled **Simulate evidence-linked finding** and **Simulate CT/SEG mismatch** show example outcomes. These buttons do not call IRIS, a model, or a native AI agent. The [media gallery](https://kennethjsmithdev.github.io/DICOM3D_AI/gallery/) identifies the footage and its provenance.

## 2. Run the native workflow locally

Use the [contest installation and demonstration guide](https://github.com/KennethJSmithDev/DICOM3D_AI/blob/82996e5db4806ed0d413642b152f74459d78ae83/contest/build154/README.md#install-and-run) for the exact authorized Community AI Hub Build 154 image, separate FHIR fixture, pinned model, software and startup instructions. The 0.2.0 IPM package installs classes and optional tools; it does **not** install or start the full viewer, FHIR service, model, bridge or production.

With the separately configured native workflow running on a trusted local host:

1. Open the public H000 research study and make sure `lesion.lung.mass.001` is not selected.
2. Choose **Explain documented finding with native AI Hub** and authenticate as described by the installation guide. Wait for a real native response; a timeout or failed inference is a failed run, not a successful replay.
3. Inspect the explanation and the validator-accepted citations: `Observation/r5p-h000-mask-volume` and `ImagingSelection/r5p-h000-segment-1`. The accepted semantic identity is `lesion.lung.mass.001`; observe that it becomes selected in the viewer.
4. Choose **Review synthetic CT/SEG mismatch**. The expected outcome is a review request for the conflicting synthetic evidence, without presenting a corrected patient record.

The historical contest workflow was witnessed with the earlier frozen packet. Separately, the experimental R5 research-fixture operation in an installed 0.2.0 archive produced one genuine native decision and selected the initially unselected H000 lesion in a headed viewer. That witness used a privately injected bridge in the Safe Demo viewer; the public demo does not execute the native agent. The model copy passed its pinned hash before and after that run, while an earlier transient model-read mismatch remains unexplained. One witness does not establish repeatability or clinical validity. R4/R4B selected-field representations are derived projections and remain review-only. See the [versioned evidence notes](../ideas/fhir-versioned-evidence/README.md) for the source, trust and validation boundaries.

## 3. Inspect the implementation

| Boundary | Source | What to inspect |
|---|---|---|
| Interoperability production | [Production](../src/cls/Native005/Production.cls) and [entry service](../src/cls/Native005/Service.cls) | The request route and review operations. |
| Native agent and validator | [Operation](../src/cls/Native005/Operation.cls) | Native `%AI.Agent` invocation and the exact identity/citation acceptance gate. |
| Restricted evidence | [FHIR tools](../src/cls/Native001/Tools.cls) and [agent toolset](../src/cls/Native005/Tools.cls) | Fixed evidence references and selection scope. |
| New 0.2.0 examples | [Research additions](IDEAS.md) | Separate R5/OpenAPI projection, synthetic metadata, optional tools and their limitations. |
| Experimental source binding | [Evidence inspector](../ideas/fhir-versioned-evidence/evidence-review.mjs) and [native binding](../ideas/fhir-versioned-evidence/native/H000Binding.cls) | Instance, series and subset checks; derived R4/R4B projections remain review-only. |

The validator checks identity and exact citations; it does not independently fact-check every sentence. The generalized anatomy is not registered to the research imaging.

## Safety and cleanup

The frozen `contest.py stop` can invoke an unscoped IRIS production shutdown. Never use it if ownership is uncertain or another production may have replaced the original; use manual, operator-supervised recovery in that situation. Loopback HTTP Basic authentication does not authenticate the listener, and the separate local provider relay has its own trust and availability limitations. Keep credentials and local state private. Do not use private patient studies with this research fixture.

During isolated testing of the separate 0.2.0 synthetic metadata production, the first shutdown request failed. The operator later explained that they had accidentally closed the test window while aiming for another one—proof that even the human in the loop can pick the wrong window. Later stop tests succeeded; the original log did not capture the exact error, so it does not independently prove the cause. Check production identity and state before operator-supervised shutdown. No global Docker cleanup is required for this walkthrough.
