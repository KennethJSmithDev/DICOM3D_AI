# DICOM adapter and mirror: research scope

The current native evidence tool reads a fixed list of FHIR R5 resources; the Safe Demo displays an existing research imaging fixture. Neither is an IRIS DICOM adapter, DICOMweb retrieval path, mirrored service, or failover witness.

A read-only class-dictionary inventory in the isolated Community AI Hub Build 154 USER namespace found 45 `EnsLib.DICOM.*` classes, including `Adapter.TCP`, `Service.TCP`, `Service.File`, and `Operation.TCP`. Their presence identifies an existing capability worth inspecting; it does not establish a valid license, configuration, functioning DICOM transfer, mirror support, or suitability of any particular class for a given service.

Start with the existing public/synthetic research imaging and its recorded Study, Series and SOP identity. Inspect installed, licensed InterSystems DICOM interoperability capabilities before selecting an adapter. In an independently owned synthetic fixture, establish a single retrieval path and compare source identifiers, byte integrity and authorized access. Preserve DICOM image geometry and original source bytes. Reject conflicting identifiers and return a reviewable failure rather than inventing a match.

Only after that single-node proof, define an isolated supported IRIS mirror with the required licensed nodes, failover routing, ownership, storage and teardown. Test an interruption and compare acknowledged message and imaging identity before and after failover. A two-node/mirror deployment, mirror licensing, DICOM connection, failover, and live PACS behavior are not implemented or qualified by this document. No patient data or existing PACS should be used.
