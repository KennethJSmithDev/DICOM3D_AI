# DICOM3D_AI IPM package

This package installs the eight native AI Hub contest workflow classes. It does not install or start the viewer, browser bridge, FHIR service, model, provider relay, credentials, users, or production. They require the separately supplied prerequisites and setup documented in [the contest packet](https://github.com/KennethJSmithDev/DICOM3D_AI/blob/65f4d64510bb10f831a98d79414894725ccb40ce/contest/build154/README.md). This is research software, not clinical decision support.

**Status:** local archive installation and lifecycle checks passed in an isolated Build 154 environment. Registry publication and independent installation by package name have not been verified. Do not assume `zpm "install dicom3d-ai"` works until the package is published and verified. The historical packet's production-shutdown and loopback trust limitations remain described in the root README.

Use the exact authorized Community AI Hub Build 154 runtime with Interoperability enabled and IPM available. Load into a dedicated namespace without existing `Native001` or `Native005` classes. The installer checks for those class prefixes and fails closed on a collision. Avoid using an existing production namespace. The package does not create FHIR resources, security roles, users, databases or launch a production.

The normal source tree in `src/cls` is a byte-for-byte packaging mirror of the accepted classes in `contest/build154/src`. Run `python scripts/check_ipm_package.py` after any changes; the frozen files remain authoritative. `preload/cls/DICOM3DAI/IPM/Guard.cls` is the package-specific collision guard.

Local developer testing from a checkout mounted within an isolated IRIS instance:

```objectscript
zpm "load /path/to/DICOM3D_AI"
```

A successful class installation alone does not demonstrate a native agent decision. The original contest workflow additionally requires the separate FHIR R5 service, fixed nine-resource fixture and restricted reader, the specifically configured local provider/relay, bridge and viewer. Read the root README's security and shutdown warning before using the historical launcher. Do not point this fixture at private patient data.

The local package build uses `zpm "package dicom3d-ai -only -path /tmp/dicom3d-ai-0.1.0"` after successful local loading in a clean, dedicated build namespace. `-only` exports the already loaded classes without running the collision-guarded reload again; verify the produced archive against the expected source and retain its identity. The collision guard deliberately blocks reloading over existing `Native001` or `Native005` classes, including a previous installation; uninstall or upgrade must not erase audit/review globals. A registry installation by name remains a separate publication and fresh-install gate.
