import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilityOpenApi } from './fhir-openapi.mjs';
const mk = version => JSON.stringify({resourceType:'CapabilityStatement', fhirVersion:version, rest:[{mode:'server',resource:[
  {type:'ImagingStudy',interaction:[{code:'read'},{code:'search-type'},{code:'update'}]},
  ...(version === '5.0.0' ? [{type:'ImagingSelection',interaction:[{code:'read'}]}] : []),
  {type:'Observation',interaction:[{code:'read'}]}
]}, {mode:'client',resource:[{type:'Patient',interaction:[{code:'read'}]}]}]});
test('R4, R4B and R5 advertise only their declared read and search operations', () => {
 for (const [v,label] of [['4.0.1','R4'],['4.3.0','R4B'],['5.0.0','R5']]) { const r=capabilityOpenApi(mk(v));
  const expected=['/ImagingStudy','/ImagingStudy/{id}','/Observation/{id}'];
  if (v === '5.0.0') expected.unshift('/ImagingSelection/{id}');
  assert.equal(r.document.openapi,'3.1.0'); assert.equal(r.document.info.title,`FHIR ${label} advertised read and search interactions`);
  assert.deepEqual(Object.keys(r.document.paths),expected);
  assert.deepEqual(r.omitted,['ImagingStudy: update']); assert.ok(!r.document.paths['/Patient/{id}']);
 }
});
test('unknown version and invalid source are refused', () => {
 assert.throws(()=>capabilityOpenApi(mk('4.2.0')),/FHIR R4/); assert.throws(()=>capabilityOpenApi('{'),/JSON CapabilityStatement/);
 assert.throws(()=>capabilityOpenApi(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:'5.0.0',rest:[{mode:'server',resource:[{type:'../bad'}]}]})),/resource declaration/);
});
