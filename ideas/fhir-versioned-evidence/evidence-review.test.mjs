import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {inspectEvidenceRelationships} from './evidence-review.mjs';
import {inspectPinnedSynthetic} from './reader.mjs';
const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(version) {
 const subject={reference:'Patient/synthetic'}, meta={versionId:'1'};
 const ct={resourceType:'ImagingStudy',id:'ct',meta,status:'available',subject,identifier:[{system:'urn:dicom:uid',value:'urn:oid:1.2.3'}]};
 const seg={...ct,id:'seg'};
 function selection(id,from) {
  const common={id,meta,subject,identifier:id==='seg-sel'?[{system:'urn:dicom3d:research:evidence',value:'synthetic.structure.001'}]:[]};
  if(version==='5.0.0') return {...common,resourceType:'ImagingSelection',status:'available',studyUid:'1.2.3',frameOfReferenceUid:'1.2.4',derivedFrom:[{reference:`ImagingStudy/${from}`}]};
  if(version==='4.0.1') return {...common,resourceType:'Basic',meta:{...meta,profile:['http://hl7.org/fhir/4.0/StructureDefinition/R5-ImagingSelection-for-R4']},code:{coding:[{system:'http://hl7.org/fhir/fhir-types',code:'ImagingSelection'}]},extension:[{url:ext,extension:[{url:'status',valueCode:'available'},{url:'studyUid',valueId:'1.2.3'},{url:'frameOfReferenceUid',valueId:'1.2.4'},{url:'derivedFrom',valueReference:{reference:`ImagingStudy/${from}`}}]}]};
  return {...common,resourceType:'Basic',meta:{...meta,profile:['http://hl7.org/fhir/5.0/StructureDefinition/profile-ImagingSelection']},code:{text:'synthetic'},modifierExtension:[{url:ext+'.status',valueCode:'available'}],extension:[{url:ext+'.code',valueCodeableConcept:{text:'synthetic'}},{url:ext+'.studyUid',valueId:'1.2.3'},{url:ext+'.frameOfReferenceUid',valueId:'1.2.4'},{url:ext+'.derivedFrom',valueReference:{reference:`ImagingStudy/${from}`}}]};
 }
 const s=selection('seg-sel','seg'), c=selection('ct-sel','ct'), sr=`${s.resourceType}/${s.id}`,cr=`${c.resourceType}/${c.id}`;
 const observation={resourceType:'Observation',id:'obs',meta,subject,status:'final',focus:[{reference:sr}],derivedFrom:[{reference:sr},{reference:cr}]};
 const wrap=resource=>{const originalBytes=Buffer.from(JSON.stringify(resource));return {resource,originalBytes,sourceSha256:sha(originalBytes),resourceReference:`${resource.resourceType}/${resource.id}`,sourceId:'fixture',sourceFingerprint:'source',capabilitySha256:'capability',fhirVersion:version};};
 return {ct:wrap(ct),seg:wrap(seg),selection:wrap(s),context:wrap(c),observation:wrap(observation),semanticId:'synthetic.structure.001'};
}
const resync=record=>{record.originalBytes=Buffer.from(JSON.stringify(record.resource));record.sourceSha256=sha(record.originalBytes);};
for(const version of ['4.0.1','4.3.0','5.0.0']) test(`${version}: matching synthetic identities remain review only`,()=>{
 const f=fixture(version),out=inspectEvidenceRelationships(f);
 assert.equal(out.reason,'SOURCE_BINDING_REQUIRED');assert.equal(out.outcome,'REVIEW_REQUIRED');
});
for(const version of ['4.0.1','4.3.0','5.0.0']) test(`${version}: pinned HTTP records reach the relationship inspector`,async t=>{
 const f=fixture(version), keys=['ct','seg','selection','context','observation'];
 const types=[...new Set(keys.map(k=>f[k].resource.resourceType))];
 const server=createServer((req,res)=>{
  res.setHeader('content-type','application/fhir+json');
  if(req.url==='/fhir/metadata') return res.end(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:version,rest:[{mode:'server',resource:types.map(type=>({type,interaction:[{code:'read'}]}))}]}));
  const match=keys.map(k=>f[k]).find(x=>req.url==='/fhir/'+x.resourceReference);
  if(!match){res.statusCode=404;return res.end('{}');} return res.end(match.originalBytes);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const config={dataClass:'synthetic',sourceId:'fixture',fhirVersion:version,baseUrl:`http://127.0.0.1:${server.address().port}/fhir`};
 const read=await Promise.all(keys.map(k=>{const x=f[k];return inspectPinnedSynthetic(config,{type:x.resource.resourceType,id:x.resource.id,versionId:'1',sha256:x.sourceSha256});}));
 const checked=Object.fromEntries(keys.map((k,i)=>[k,read[i]]));checked.semanticId=f.semanticId;
 assert.equal(inspectEvidenceRelationships(checked).reason,'SOURCE_BINDING_REQUIRED');
});
test('detects changed bytes, source changes, subject, mismatch and wrong references',()=>{
 let f=fixture('5.0.0');f.selection.originalBytes[0]=0;assert.equal(inspectEvidenceRelationships(f).reason,'SOURCE_BYTES_UNVERIFIED');
 f=fixture('5.0.0');f.context.sourceId='other';assert.equal(inspectEvidenceRelationships(f).reason,'SOURCE_SCOPE_MISMATCH');
 f=fixture('5.0.0');f.context.resource.subject={reference:'Patient/other'};resync(f.context);assert.equal(inspectEvidenceRelationships(f).reason,'SUBJECT_MISMATCH');
 f=fixture('5.0.0');f.selection.resource.frameOfReferenceUid='1.9.9';resync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'STUDY_OR_FRAME_MISMATCH');
 f=fixture('5.0.0');f.observation.resource.focus=[{reference:'ImagingSelection/other'}];resync(f.observation);assert.equal(inspectEvidenceRelationships(f).reason,'OBSERVATION_REFERENCE_MISMATCH');
 f=fixture('5.0.0');f.selection.resource.identifier[0].value='other';resync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'SEMANTIC_IDENTITY_MISMATCH');
 f=fixture('5.0.0');f.ct.resource.identifier={value:'not-an-array'};resync(f.ct);assert.equal(inspectEvidenceRelationships(f).reason,'STUDY_OR_FRAME_MISMATCH');
 f=fixture('5.0.0');f.selection.resource.identifier={value:'not-an-array'};resync(f.selection);assert.equal(inspectEvidenceRelationships(f).reason,'SEMANTIC_IDENTITY_MISMATCH');
});
test('inspects the preserved R5 research fixture without changing its source',async()=>{
 const entries=JSON.parse(await readFile(new URL('../../contest/build154/fixtures/evidence.json',import.meta.url),'utf8'));
 const paths={ct:'/ImagingStudy/r5p-h000-ct',seg:'/ImagingStudy/r5p-h000-seg',selection:'/ImagingSelection/r5p-h000-segment-1',context:'/ImagingSelection/r5p-h000-ct-context',observation:'/Observation/r5p-h000-mask-volume'};
 const records={semanticId:'lesion.lung.mass.001'};
 for(const [key,path] of Object.entries(paths)) {
  const entry=entries.find(e=>e.path===path);assert.ok(entry);
  // The fixture contains parsed resources, so these are newly serialized test bytes,
  // not a claim about the original server response's byte identity.
  const originalBytes=Buffer.from(JSON.stringify(entry.resource));
  records[key]={resource:entry.resource,originalBytes,sourceSha256:sha(originalBytes),resourceReference:path.slice(1),sourceId:'research-fixture',sourceFingerprint:'fixture',capabilitySha256:'synthetic',fhirVersion:'5.0.0'};
 }
 const binding=await readFile(new URL('../../contest/build154/frontend/demo/h000/source-binding.json',import.meta.url));
 records.sourceBinding={originalBytes:binding,sourceSha256:sha(binding)};
 const result=inspectEvidenceRelationships(records);
 assert.equal(result.reason,'CONSISTENT_IDENTITIES_NOT_SELECTION_AUTHORIZATION');
 assert.deepEqual(result.citations,['Observation/r5p-h000-mask-volume','ImagingSelection/r5p-h000-segment-1']);
});
