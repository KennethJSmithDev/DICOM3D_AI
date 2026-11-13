# FHIR CapabilityStatement to OpenAPI: local R4/R4B/R5 prototype

This offline prototype reuses the DICOM3D_AI owner's original ISAIAH `capabilityOpenApi` converter, from the locally qualified ISAIAH R5 candidate tree `26df81c07b3f0d8bf31fa8af18415ef102d8a9a1`. It implements a bounded part of [DPI-I-804](https://ideas.intersystems.com/ideas/DPI-I-804). DICOM3D_AI adds R4B version handling to the copied converter; ISAIAH remains unchanged and independent. The same-owner source is covered by the project's Apache-2.0 license.

Run `node export-openapi.mjs <local-capability.json> <new-output.json>`. The tool reads only a caller-selected local file up to 8 MiB and refuses to overwrite output; it makes no network requests. It emits OpenAPI 3.1 for declared server read and search interactions and reports omitted interactions. It accepts FHIR 4.0.1, 4.3.0, and 5.0.0. It does not export authentication, server URLs, search parameters, full schemas or evidence of actual permissions or live server behavior.

The converter is an optional Node.js tool copied by the IPM package; it is not an IRIS class, FHIR service, native-agent integration or patient-data access mechanism. Synthetic fixture tests and prior ISAIAH qualification do not establish full FHIR conformance, clinical use or public-registry installation.
