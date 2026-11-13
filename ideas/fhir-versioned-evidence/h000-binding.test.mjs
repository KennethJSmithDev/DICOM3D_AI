import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inspectEvidenceRelationships} from './evidence-review.mjs';
import {projectH000Selection} from './h000-projection.mjs';

const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixture=JSON.parse(await readFile(new URL('../../contest/build154/fixtures/evidence.json',import.meta.url),'utf8'));
const bindingBytes=await readFile(new URL('../../contest/build154/frontend/demo/h000/source-binding.json',import.meta.url));
const bindingHash='605073678ef244b7ebd44995d01789e79f5cb31a715c66a21d4b76b12161d73e';
const paths={ct:'/ImagingStudy/r5p-h000-ct',seg:'/ImagingStudy/r5p-h000-seg',selection:'/ImagingSelection/r5p-h000-segment-1',context:'/ImagingSelection/r5p-h000-ct-context',observation:'/Observation/r5p-h000-mask-volume'};
const sync=entry=>{entry.originalBytes=Buffer.from(JSON.stringify(entry.resource));entry.sourceSha256=sha(entry.originalBytes);};
function records(version) {
 const output={semanticId:'lesion.lung.mass.001',sourceBinding:{originalBytes:bindingBytes,sourceSha256:bindingHash}};
 for (const [key,path] of Object.entries(paths)) {
  let resource=structuredClone(fixture.find(x=>x.path===path).resource);
  if(key==='selection'||key==='context') resource=projectH000Selection(resource,version);
  if(key==='observation' && version!=='5.0.0') {
   for(const ref of [...resource.focus,...resource.derivedFrom]) ref.reference=ref.reference.replace('ImagingSelection/','Basic/');
  }
  const record={resource,resourceReference:`${resource.resourceType}/${resource.id}`,sourceId:'retained-research-binding',sourceFingerprint:'test',capabilitySha256:'test',fhirVersion:version};sync(record);output[key]=record;
 }
 return output;
}
function instance(record,version) {
 if(version==='5.0.0') return record.resource.instance[0];
 const outer=version==='4.0.1'?record.resource.extension[0].extension:record.resource.extension;
 return outer.find(x=>x.url===(version==='4.0.1'?'instance':ext+'.instance')).extension;
}
for(const version of ['4.0.1','4.3.0','5.0.0']) {
 test(`${version}: retained H000 binding, version-specific research projection and negative identity controls`,()=>{
  assert.equal(sha(bindingBytes),bindingHash);
  let f=records(version),r=inspectEvidenceRelationships(f);
  assert.equal(r.reason,'CONSISTENT_IDENTITIES_NOT_SELECTION_AUTHORIZATION');assert.equal(r.outcome,'REVIEW_REQUIRED');
  f=records(version);const i=instance(f.selection,version);
  if(version==='5.0.0') i.uid='1.2.3.999';else i.find(x=>x.url==='uid').valueId='1.2.3.999';
  sync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'SEG_INSTANCE_MISMATCH');
  f=records(version);const subset=instance(f.selection,version);
  if(version==='5.0.0') subset.subset=['2'];else subset.find(x=>x.url==='subset').valueString='2';
  sync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'SEG_SUBSET_MISMATCH');
  f=records(version);f.ct.resource.series[0].instance[0].uid='1.2.3.999';sync(f.ct);
  assert.equal(inspectEvidenceRelationships(f).reason,'CT_INSTANCE_MISMATCH');
  f=records(version);const ci=instance(f.context,version);
  if(version==='5.0.0') ci.uid='1.2.3.999';else ci.find(x=>x.url==='uid').valueId='1.2.3.999';
  sync(f.context);assert.equal(inspectEvidenceRelationships(f).reason,'CT_CONTEXT_INSTANCE_MISMATCH');
  f=records(version);const wrongClass=instance(f.selection,version);
  if(version==='5.0.0') wrongClass.sopClass.code='urn:oid:1.2.3';else wrongClass.find(x=>x.url==='sopClass').valueCoding.code='urn:oid:1.2.3';
  sync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'SOP_CLASS_MISMATCH');
  f=records(version);f.seg.resource.series[0].uid='1.2.3';sync(f.seg);
  assert.equal(inspectEvidenceRelationships(f).reason,'SERIES_BINDING_MISMATCH');
  f=records(version);f.sourceBinding.sourceSha256='0'.repeat(64);
  assert.equal(inspectEvidenceRelationships(f).reason,'SOURCE_BINDING_REQUIRED');
 });
}
