// Build a separate, static AI Hub simulation from the qualified Babylon payload.
// The source payload and accepted packet are never modified.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {loadSemanticIndex,loadSemanticBundle,mergeSemanticBundles} from './semantic-atlas-loader.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const frontend = resolve(here, '../build154/frontend');
const packetRoot = resolve(here, '../build154');
const output = process.argv[2] && resolve(process.argv[2]);
if (!output || existsSync(output)) throw Error('Provide a new, absent output directory.');
const manifest = JSON.parse(readFileSync(join(packetRoot, 'MANIFEST.json'), 'utf8'));
for (const item of manifest.files) {
  const bytes = readFileSync(join(packetRoot, item.path));
  if (bytes.length !== item.bytes || createHash('sha256').update(bytes).digest('hex') !== item.sha256)
    throw Error('Qualified source mismatch: '+item.path);
}
const dest = join(output, 'DICOM3D_AI');
mkdirSync(dest, { recursive: true });
function walk(dir) {
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const src = join(dir, entry.name), rel = relative(frontend, src).split(sep).join('/');
    if (entry.isSymbolicLink()) throw Error('Source symlink refused: '+rel);
    if (entry.isDirectory()) { walk(src); continue; }
    if (!entry.isFile()) continue;
    if (/^reference\/(?:hra-female|HRA-FEMALE)/i.test(rel)) continue;
    // These describe the original two-reference build and would be false for
    // this assembled male-only site; its identity is recorded separately.
    if (rel === 'demo-build-manifest.json' || /^reference\/anatomy-(?:admission|owner-map|source-catalog)\.json$/.test(rel)) continue;
    const out = join(dest, rel); mkdirSync(resolve(out, '..'), {recursive:true});
    if (['.html','.js','.css'].includes(extname(src))) {
      // The existing preload helper resolves its URL relative to an assets module.
      // Use the explicitly reserved Pages subpath, not a document-relative URL.
      let value = readFileSync(src, 'utf8').replaceAll('/DICOM3D/', '/DICOM3D_AI/');
      if (rel === 'assets/reference-DKjax1AJ.js') {
        if (value.includes('<option value="hra-female">') || !value.includes('[`bp3d-male`].includes(rt??``)'))
          throw Error('Unexpected male-only reference-selector identity');
      }
      if (rel === 'assets/engine-sScv1jqR.js') {
        const fps = 'e._renderFn=i=>{let a=n?0:';
        const dpr = 'Math.min(globalThis.devicePixelRatio||1,e.maxDevicePixelRatio)';
        if (value.split(fps).length !== 2 || value.split(dpr).length !== 2) throw Error('Unexpected engine identity');
        value = value.replace(fps, 'e._renderFn=i=>{if(globalThis.__dicom3dEfficient&&i-(e.__efficientLast||0)<1000/30){e._animFrameId=requestAnimationFrame(e._renderFn);return}e.__efficientLast=i;globalThis.__dicom3dRenderCount=(globalThis.__dicom3dRenderCount||0)+1;let a=n?0:');
        value = value.replace(dpr, 'Math.min(globalThis.devicePixelRatio||1,e.maxDevicePixelRatio,globalThis.__dicom3dEfficient?1:Infinity)');
      }
      if (rel === 'assets/reference-ui-Dw7Am2ib.js') {
        const initial = 'hidden:new Set,clip:y,opacity:new Map';
        const restore = 'b.selected=null,b.hidden.clear(),b.isolate=!1';
        if (value.split(initial).length !== 2 || value.split(restore).length !== 2) throw Error('Unexpected reference controller identity');
        const skins = '[...f.keys()].filter(e=>e===\x60FMA7163\x60||e===\x60VH_F_skin\x60)';
        value = value.replace(initial, 'hidden:new Set('+skins+'),clip:y,opacity:new Map');
        value = value.replace(restore, 'b.selected=null,b.hidden.clear(),'+skins+'.forEach(e=>b.hidden.add(e)),b.isolate=!1');
      }
      if (rel === 'assets/public-release-BcTT6c7N.js') {
        const original = 'title:`DICOM3D v0.6.5 RC \u2014 Visual Research Workstation`';
        if (value.split(original).length !== 2) throw Error('Unexpected release title identity');
        value = value.replace(original, 'title:`DICOM3D AI Hub \u2014 Safe Demo`');
      }
      if (rel === 'assets/public-workstation-4r6yTnRH.js') {
        // Default to Scientific; retain the chosen mode across compatible view switches.
        const initialMode = 'O=null,k=null,A=0,j=`holographic`,M=1';
        const attachMode = 'j=e.visual.supportedModes?.length===1?`scientific`:`holographic`,M=1';
        const initialButtons = '<button data-mode="scientific">Scientific</button><button data-mode="holographic" aria-pressed="true">Holographic</button>';
        const initialLabel = '<span id="viewLabel">HOLOGRAPHIC</span>';
        for (const part of [initialMode, attachMode, initialButtons, initialLabel])
          if (value.split(part).length !== 2) throw Error('Unexpected mode controller identity');
        value = value.replace(initialMode, 'O=null,k=null,A=0,j=`scientific`,M=1');
        value = value.replace(attachMode, 'j=e.visual.supportedModes&&!e.visual.supportedModes.includes(j)?`scientific`:j,M=1');
        value = value.replace(initialButtons, '<button data-mode="scientific" aria-pressed="true">Scientific</button><button data-mode="holographic" aria-pressed="false">Holographic</button>');
        value = value.replace(initialLabel, '<span id="viewLabel">SCIENTIFIC</span>');
        // Preserve the controller and source asset: only completed playback settles into Scientific.
        const complete = 'q(),H.lastPlay.completedAtMs=e,W()';
        const reducedPlay = 'if(J(\x60materialization\x60),d(\x60reduced\x60).checked){X(1);return}';
        const reducedWhilePlaying = 'd(\x60reduced\x60).checked&&(q(),X(1)),W()';
        for (const part of [complete, reducedPlay, reducedWhilePlaying])
          if (value.split(part).length !== 2) throw Error('Unexpected materialization controller identity');
        value = value.replace(complete, 'q(),H.lastPlay.completedAtMs=e,J(\x60scientific\x60),W()');
        value = value.replace(reducedPlay, 'if(J(\x60materialization\x60),d(\x60reduced\x60).checked){X(1),J(\x60scientific\x60),W();return}');
        value = value.replace(reducedWhilePlaying, 'd(\x60reduced\x60).checked&&(N?(q(),X(1),J(\x60scientific\x60)):(q(),X(1))),W()');
      }
      if (['index.html','reference.html'].includes(rel)) {
        value = value.replace('<title>DICOM3D v0.6.5 RC — Visual Research Workstation</title>', '<title>DICOM3D AI Hub — Safe Demo</title>');
        value = value.replace('</head>', '<link rel="stylesheet" href="./mobile-layout.css"><script src="./mobile-profile.js"></script></head>');
        value = value.replace('</body>', '<script src="./navigation.js" defer></script><script src="./simulation.js" defer></script></body>');
      }
      writeFileSync(out, value);
    } else cpSync(src, out);
  }
}
walk(frontend);
// Assemble the unchanged, hash-verified source bundles using the established
// Babylon semantic loader. The frozen native packet remains untouched.
const atlasDirectory = pathToFileURL(join(here, 'expanded-atlas') + sep);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, {signal}={}) => {
  signal?.throwIfAborted();
  if (!(url instanceof URL) || url.protocol !== 'file:' || new URL('./',url).href !== atlasDirectory.href) throw Error('Unexpected atlas source URL');
  const bytes = readFileSync(fileURLToPath(url));
  return new Response(bytes, {headers:{'content-length':String(bytes.length)}});
};
let atlas;
try {
  const index = await loadSemanticIndex(atlasDirectory);
  if (index.bundles.length !== 17 || index.structures.length !== 1205) throw Error('Unexpected atlas index identity');
  const bundles = [];
  for (const entry of index.bundles) bundles.push(await loadSemanticBundle(index, atlasDirectory, entry.id));
  atlas = await mergeSemanticBundles(index, bundles);
} finally { globalThis.fetch = originalFetch; }
atlas.manifest.asset.relative_filename = 'bp3d-male.glb';
writeFileSync(join(dest,'reference','bp3d-male.glb'), Buffer.from(atlas.bytes));
writeFileSync(join(dest,'reference','bp3d-male.manifest.json'), JSON.stringify(atlas.manifest,null,2)+'\n');
cpSync(join(here,'expanded-atlas','LICENSE.md'), join(dest,'reference','EXPANDED-BODYPARTS3D-NOTICE.md'));
cpSync(resolve(here,'../../assets/branding/dicom3d-ai-hub-logo.png'), join(dest,'brand','dicom3d-ai-hub-logo.png'));
for (const file of ['mobile-profile.js','mobile-layout.css','navigation.js','simulation.js']) cpSync(join(here,file), join(dest,file));
const note = {mode:'static-simulation', nativeAgent:false, source:'AIHub-Contest-Build 8631beab6717b1508aa86437c68f4acbe5ea083a', quality:'Explicit choice; efficient caps at 30fps and DPR 1 independently of layout', maleOwners:1205, atlasIndexSha256:'574feef9e1e659a644cf51a51042e8c65b6433455b95070b7ae89aa681357478', femaleAtlas:false};
writeFileSync(join(dest,'demo-identity.json'), JSON.stringify(note,null,2)+'\n');
console.log(JSON.stringify({status:'BUILT',output:dest,...note}));
