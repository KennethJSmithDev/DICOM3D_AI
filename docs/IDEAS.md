# DICOM3D_AI 0.2.0 research additions

The 0.2.0 source includes separately scoped synthetic metadata and experimental source-bound H000 classes, plus optional local tools, alongside the existing native contest classes. Installation does not start a production, expose an HTTP endpoint, configure a FHIR server, or grant permissions.

## FHIR CapabilityStatement projection

The optional [offline R4/R4B/R5 exporter](../ideas/fhir-openapi-r5/README.md) reuses the owner's ISAIAH converter. Run it separately with Node.js against caller-selected local metadata. It emits OpenAPI 3.1 read/search declarations, not an IRIS class or network service. Search parameters, authentication, full resource schemas and live endpoint behavior remain outside its scope. The ISAIAH implementation's earlier R5 test is separate from this package's qualification.

## Synthetic interoperability metadata

`DICOM3DAI.Metadata.Production` is a separate synthetic example. It passes request, case, study and evidence identifiers through its own service and operation; missing identifiers are rejected and mismatched declared study IDs request review. It never modifies or starts `Native005.Production`. Comparing two declared IDs does not independently verify source identity, and message persistence is not a substitute for an access policy or immutable audit. Do not use this example with patient information.

In one clean-install test, the first request to stop this synthetic production returned failure; a later stop succeeded. The operator later reported accidentally closing the test window; the log does not independently establish the cause. Use a dedicated namespace and verify the running production's identity and state before any operator-supervised shutdown.

## Optional local tools and source-only experiments

The IPM package copies the local OpenAPI inspection tool and the reviewed declarative test-plan tools into its `tools` directory. These Python utilities run only when invoked separately; they do not start or configure services. The checkout additionally contains a fictional longitudinal fixture and DICOM-adapter research scope; those are not installed by the IPM module. A local model produced an incorrect mismatch expectation during testing; the uncorrected test failed and a separate reviewer-corrected plan passed. This is not a claim of reliable native inference or clinical suitability.

## Version-aware research evidence fixture

The [versioned evidence experiment](../ideas/fhir-versioned-evidence/README.md) compares a pinned H000 research binding with R5 resources and derived R4/R4B selected-field projections. It checks study, series, frame, CT/SEG instances and segment subset; the projections are not original R4/R4B server resources or independently validated full profiles. The package includes separate experimental native classes and fixture preparation resources. R4/R4B results remain review-only; the original contest workflow remains R5-only. One R5 native/browser witness used the installed experimental classes and selected the initially unselected lesion; its model copy matched the pinned hash before and after. An earlier transient model-read mismatch remains unexplained. The witness used an isolated fixture, a separately configured private bridge and a Safe Demo viewer, not the public simulated backend.
