# AI Hub static Safe Demo prototype

Build locally using `node contest/safe-demo/build.mjs <new-output-directory>`.
Serve the output directory with a static web server and open
`/DICOM3D_AI/`. No deployment workflow is changed.

The existing Babylon viewer and public research fixture remain interactive.
The two AI actions are deterministic simulations; no native agent, IRIS,
authentication or model runs. Visitors choose a rendering quality profile.
Efficient mode caps rendering at 30 frames per second and device pixel ratio
at 1; a conservative interim profile applies until a choice is made. Screen
width controls layout independently of this choice.
The phone's actual temperature, battery use and browser compatibility require
physical-device verification.

The build verifies 17 expanded BodyParts3D source bundles and their manifests,
then assembles one 1,205-owner male reference GLB for the existing viewer.
The generated demo contains no female GLB. Native source is a male-only
derivative of the separately preserved historical packet.
The generated site is large; mobile memory and physical-device performance
remain to be measured.

The [expanded-atlas notice](expanded-atlas/LICENSE.md) preserves the original
fifteen-bundle wording; this index also includes two source-recovery bundles.
The number of geometry owners is not a count of independently validated organs.

The desktop rail offers Viewer, Imaging, Anatomy, Lab, Learn and Open Study.
Open Study opens the existing verified local-file controls. Viewer returns to
the reference, and Imaging opens the research study. The male skin starts
hidden; source anatomy geometry is not changed.
