# DICOM3D_AI IPM package

The 0.2.0 source module includes the eight native AI Hub contest workflow classes, five synthetic-metadata example classes, and eleven experimental source-bound research classes. It copies optional Node.js and Python tools and the approved H000 research metadata needed to prepare a local fixture. Installation does not start a production, viewer, browser bridge, fixture service, model or provider relay, or create users or credentials. They require separate setup and the prerequisites documented in [the contest packet](https://github.com/KennethJSmithDev/DICOM3D_AI/blob/65f4d64510bb10f831a98d79414894725ccb40ce/contest/build154/README.md). This is research software, not clinical decision support. See [IDEAS.md](IDEAS.md) for limitations.

**Status:** DICOM3D_AI 0.2.0 is available in the GitHub source and listed on [Open Exchange](https://openexchange.intersystems.com/package/DICOM3D-AI). Test-registry publication and a separate clean package-name installation (`zpm "install dicom3d-ai"`) passed for tested source commit `dda09190e671afbeef938490c5b868ff35384fc0` on InterSystems IRIS for Health Community AI Hub Build 154U with IPM 0.10.9. This establishes the test-registry path only; production-registry availability and a full first-run application setup remain unverified. One separately configured historical native execution showed a source-bound R5 viewer selection; it does not establish inference reliability. The historical packet's production-shutdown and loopback trust limitations remain described in the root README.

Use the exact authorized Community AI Hub Build 154 runtime with Interoperability enabled and IPM available. Load into a dedicated namespace without existing `Native001`, `Native005`, `DICOM3DAI.Metadata`, or `DICOM3DAI.FHIR` classes. The installer checks these prefixes and fails closed on a collision. Avoid using an existing production namespace. The package does not create FHIR resources, security roles, users, databases or launch a production.

The eight `Native001` / `Native005` classes in `src/cls` mirror the accepted classes in `contest/build154/src` byte-for-byte. The experimental `DICOM3DAI.FHIR` classes mirror their separately maintained research sources. Run `python scripts/check_ipm_package.py` after any changes; the frozen contest files remain unchanged. `preload/cls/DICOM3DAI/IPM/Guard.cls` is the package-specific collision guard.

The experimental classes are a separate, opt-in fixture witness; they do not replace or silently alter the eight historical `Native001` / `Native005` classes. The included `experimental/fhir/README.md` describes the narrowly scoped field checks and source limitations. The fixture generator verifies exact approved input hashes and creates a new output directory; the companion server uses loopback port 18136 and generates a per-run credential. To use it in an isolated Linux runtime, mount that generated directory at `/run/dicom3d-ai-research` and run the fixture server inside the same network namespace as IRIS. The input files are the installed `experimental/fhir/fixtures/evidence.json` and `source-binding.json`. This loopback Basic-auth fixture authenticates the client, not the listener; it is not suitable for private patient data or an untrusted host. An R4 or R4B result remains review-only. The separate H000 R5 witness additionally requires the named local model, relay and viewer; package installation alone does not run or qualify them.

Local developer testing from a checkout mounted within an isolated IRIS instance:

```objectscript
zpm "load /path/to/DICOM3D_AI"
```

For an already-built candidate archive copied into the isolated IRIS environment, use its actual local path instead:

```objectscript
zpm "load /path/to/dicom3d-ai-0.2.0.tgz"
```

A fresh-container test used the separately supplied Community Build 154 image, an offline IPM 0.10.9 installer and a dedicated namespace. The installer and IRIS image are external prerequisites; that test does not establish a clean-machine setup of the complete viewer and model or a registry install by name.

A successful class installation alone does not demonstrate a native agent decision. The original contest workflow additionally requires the separate FHIR R5 service, fixed nine-resource fixture and restricted reader, the specifically configured local provider/relay, bridge and viewer. Read the root README's security and shutdown warning before using the historical launcher. Do not point this fixture at private patient data.

The local package build uses `zpm "package dicom3d-ai -only -path /tmp/dicom3d-ai-0.2.0"` after successful local loading in a clean, dedicated build namespace. `-only` exports the already loaded classes without running the collision-guarded reload again; verify the produced archive against the expected source and retain its identity. The guard deliberately blocks reloading over existing candidate classes, including a previous installation; uninstall or upgrade must not erase audit/review globals. A registry installation by name remains a separate publication and fresh-install gate.
