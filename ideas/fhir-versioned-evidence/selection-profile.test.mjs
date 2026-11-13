import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {inspectPinnedSynthetic} from './reader.mjs';
import {inspectSelectionProfile} from './selection-profile.mjs';

const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
const hash=s=>createHash('sha256').update(s).digest('hex');
const r4={resourceType:'Basic',id:'sel',meta:{versionId:'1',profile:['http://hl7.org/fhir/4.0/StructureDefinition/R5-ImagingSelection-for-R4']},code:{coding:[{system:'http://hl7.org/fhir/fhir-types',code:'ImagingSelection'}]},extension:[{url:ext,extension:[{url:'status',valueCode:'available'},{url:'studyUid',valueId:'1.2.3'},{url:'frameOfReferenceUid',valueId:'1.2.4'},{url:'derivedFrom',valueReference:{reference:'ImagingStudy/synthetic'}}]}]};
const r4b={resourceType:'Basic',id:'sel',meta:{versionId:'1',profile:['http://hl7.org/fhir/5.0/StructureDefinition/profile-ImagingSelection']},code:{text:'synthetic'},modifierExtension:[{url:ext+'.status',valueCode:'available'}],extension:[{url:ext+'.code',valueCodeableConcept:{text:'synthetic'}},{url:ext+'.studyUid',valueId:'1.2.3'},{url:ext+'.frameOfReferenceUid',valueId:'1.2.4'},{url:ext+'.derivedFrom',valueReference:{reference:'ImagingStudy/synthetic'}}]};
const r5={resourceType:'ImagingSelection',id:'sel',meta:{versionId:'1'},status:'available',studyUid:'1.2.3',frameOfReferenceUid:'1.2.4',derivedFrom:[{reference:'ImagingStudy/synthetic'}]};

for(const [version,object,expected] of [['4.0.1',r4,'RELATIONSHIP_VALIDATION_REQUIRED'],['4.3.0',r4b,'RELATIONSHIP_VALIDATION_REQUIRED'],['5.0.0',r5,'RELATIONSHIP_VALIDATION_REQUIRED']]) test(`${version}: pinned read preserves bytes and never authorizes selection`,async t=>{
  const original=JSON.stringify(object), requests=[]; let mode='ok';
  const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type','application/fhir+json');
    if(req.url==='/fhir/metadata') return res.end(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:version,rest:[{mode:'server',resource:[{type:object.resourceType,interaction:[{code:'read'}]}]}]}));
    return res.end(mode==='changed' ? original+' ' : original);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>new Promise(r=>server.close(r)));
  const config={dataClass:'synthetic',sourceId:'fixture',fhirVersion:version,baseUrl:`http://127.0.0.1:${server.address().port}/fhir`};
  const pin={type:object.resourceType,id:'sel',versionId:'1',sha256:hash(original)};
  const receipt=await inspectPinnedSynthetic(config,pin);
  assert.equal(receipt.originalBytes.toString(),original);assert.equal(receipt.sourceSha256,pin.sha256);
  const outcome=inspectSelectionProfile(receipt);assert.equal(outcome.outcome,'REVIEW_REQUIRED');assert.equal(outcome.reason,expected);assert.equal(outcome.sourceReference,`${object.resourceType}/sel`);
  mode='changed'; await assert.rejects(inspectPinnedSynthetic(config,pin),/SOURCE_CONTENT_MISMATCH/);
  assert.deepEqual(requests,['/fhir/metadata',`/fhir/${object.resourceType}/sel`,'/fhir/metadata',`/fhir/${object.resourceType}/sel`]);
});

test('R4B unknown status, duplicate or missing fields and profile declarations require review',()=>{
  const wrap=resource=>({resource,resourceReference:'Basic/sel',sourceId:'fixture',sourceSha256:'a'.repeat(64),fhirVersion:'4.3.0'});
  for(const change of [r=>r.modifierExtension[0].valueCode='entered-in-error',r=>r.modifierExtension.push({url:'unknown',valueBoolean:true})]) {
    const x=structuredClone(r4b);change(x);assert.equal(inspectSelectionProfile(wrap(x)).reason,'STATUS_OR_MODIFIER_UNSUPPORTED');
  }
  for(const change of [r=>r.extension.push(structuredClone(r.extension[1])),r=>r.extension.splice(0,1)]) {
    const x=structuredClone(r4b);change(x);assert.equal(inspectSelectionProfile(wrap(x)).reason,'R4B_PROFILE_INCOMPLETE');
  }
  const x=structuredClone(r4b);delete x.meta.profile;assert.equal(inspectSelectionProfile(wrap(x)).reason,'PROFILE_NOT_DECLARED');
});

test('refuses wrong references, untrusted implicit rules and R4 incomplete cross-version shapes',()=>{
  const wrap=(resource,fhirVersion)=>({resource,resourceReference:`${resource.resourceType}/${resource.id}`,sourceId:'fixture',sourceSha256:'a'.repeat(64),fhirVersion});
  assert.equal(inspectSelectionProfile({...wrap(r5,'5.0.0'),resourceReference:'ImagingSelection/other'}).reason,'INVALID_SOURCE_IDENTITY');
  assert.equal(inspectSelectionProfile(wrap({...r5,implicitRules:'unknown'},'5.0.0')).reason,'IMPLICIT_RULES_UNSUPPORTED');
  assert.equal(inspectSelectionProfile(wrap({...r4,extension:[]},'4.0.1')).reason,'R4_PROFILE_INCOMPLETE');
  const bad=structuredClone(r4);bad.extension[0].extension[0].valueCode='entered-in-error';assert.equal(inspectSelectionProfile(wrap(bad,'4.0.1')).reason,'STATUS_OR_MODIFIER_UNSUPPORTED');
  assert.equal(inspectSelectionProfile(wrap({...r5,status:'entered-in-error'},'5.0.0')).reason,'STATUS_OR_MODIFIER_UNSUPPORTED');
});

test('pinned reader refuses malformed or traversal identities before network access',async()=>{
  const config={dataClass:'synthetic',sourceId:'fixture',fhirVersion:'4.3.0',baseUrl:'http://127.0.0.1:1/fhir'};
  for(const id of ['.','..','../other']) await assert.rejects(inspectPinnedSynthetic(config,{type:'Basic',id,versionId:'1',sha256:'a'.repeat(64)}),/INVALID_PIN/);
  await assert.rejects(inspectPinnedSynthetic(config,{type:'Basic',id:'sel',versionId:'1',sha256:'not-a-hash'}),/INVALID_PIN/);
});
