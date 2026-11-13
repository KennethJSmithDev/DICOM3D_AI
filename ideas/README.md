# DICOM3D_AI research examples

These components are separate prototypes and are not part of the frozen Build 154 contest packet. The 0.2.0 source module includes some of them; registry installation remains unverified:

- [FHIR metadata to OpenAPI](fhir-openapi-r5/README.md): offline R4/R4B/R5 capability projection, with explicit authorization limitations.
- [Synthetic versioned evidence reader](fhir-versioned-evidence/README.md): optional Node tools and separate experimental native source-binding classes; R4/R4B projections remain review-only.
- [Interoperability message metadata](message-metadata/README.md): a separate synthetic production, identity checks and readback.
- [AI-assisted test proposals](ai-test-assist/README.md): bounded local model proposals reviewed as data and evaluated against synthetic tests.
- [DICOM adapter scope](dicom-adapter/SCOPE.md): existing class inventory and proposed single-node-then-mirror qualification.
- [Synthetic longitudinal-summary scope](longitudinal-summary/README.md): fictional evidence and review boundary, not an AI summary or clinical feature.

The source also contains Safe Demo keyboard changes; the public Pages deployment is separate. None of these prototypes extends the frozen native evidence allowlist, establishes clinical safety, or claims general provider reliability.
