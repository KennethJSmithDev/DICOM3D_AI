// Generate a new local public-research fixture; never modifies the inputs.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {projectH000Selection} from './h000-projection.mjs';
const args=process.argv.slice(2);
if(args.length!==3) throw Error('Usage: node prepare-h000-fixture.mjs EVIDENCE_JSON SOURCE_BINDING_JSON NEW_OUTPUT_DIRECTORY');
const [evidencePath,bindingPath,out]=args.map(x=>resolve(x));
const [evidenceBytes,bindingBytes]=await Promise.all([readFile(evidencePath),readFile(bindingPath)]);
const sha=b=>createHash('sha256').update(b).digest('hex');
if(sha(evidenceBytes)!=='59f01da2ccf387b7198ba4a5adf4b6bb58f274ed12ec037773d6f9950804d159' || sha(bindingBytes)!=='605073678ef244b7ebd44995d01789e79f5cb31a715c66a21d4b76b12161d73e') throw Error('UNAPPROVED_RESEARCH_FIXTURE_IDENTITY');
const entries=JSON.parse(evidenceBytes.toString('utf8'));
const paths={ct:'/ImagingStudy/r5p-h000-ct',seg:'/ImagingStudy/r5p-h000-seg',selection:'/ImagingSelection/r5p-h000-segment-1',context:'/ImagingSelection/r5p-h000-ct-context',observation:'/Observation/r5p-h000-mask-volume'};
const source={};
for(const [key,path] of Object.entries(paths)) {
 const matches=entries.filter(x=>x.path===path);
 if(matches.length!==1) throw Error('RESEARCH_FIXTURE_IDENTITY_MISMATCH');
 source[key]=matches[0].resource;
}
// mkdir without recursive refuses an existing output, preserving earlier runs.
await mkdir(out);
const pins={};
async function put(path,bytes) {
 const file=join(out,'http-fixture',...path.split('/').filter(Boolean));
 await mkdir(resolve(file,'..'),{recursive:true});
 await writeFile(file,bytes,{flag:'wx'});
 pins[path]=createHash('sha256').update(bytes).digest('base64');
}
await put('/h000/source-binding',bindingBytes);
for(const [route,version] of [['r4','4.0.1'],['r4b','4.3.0'],['r5','5.0.0']]) {
 const prefix='/h000/'+route;
 await put(prefix+'/metadata',Buffer.from(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:version})));
 for(const [key,original] of Object.entries(source)) {
  let resource=structuredClone(original);
  if(key==='selection'||key==='context') resource=projectH000Selection(resource,version);
  if(key==='observation' && version!=='5.0.0') for(const ref of [...resource.focus,...resource.derivedFrom]) ref.reference=ref.reference.replace('ImagingSelection/','Basic/');
  await put(prefix+'/'+resource.resourceType+'/'+resource.id,Buffer.from(JSON.stringify(resource)));
 }
}
await writeFile(join(out,'http-pins.json'),JSON.stringify(pins,null,2)+'\n',{flag:'wx'});
console.log('Prepared pinned public-research fixture; R4/R4B are derived projections.');
