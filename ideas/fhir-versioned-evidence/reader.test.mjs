import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {inspectSynthetic} from './reader.mjs';
const versions=['4.0.1','4.3.0','5.0.0'];
async function fixture(version, override={}) {
 const requests=[]; const body={resourceType:'Observation',id:'synthetic-001',status:'final',valueString:'Synthetic only'};
 const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type','application/fhir+json');
   if (req.url==='/fhir/metadata') {res.end(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:override.version??version,rest:[{mode:'server',resource:[{type:'Observation',interaction:[{code:override.advertised??'read'}]}]}]}));return;}
   if (req.url==='/fhir/Observation/synthetic-001') {res.end(JSON.stringify({...body,id:override.id??body.id}));return;}res.statusCode=404;res.end('{}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,requests,body,config:{dataClass:'synthetic',sourceId:'synthetic-'+version,fhirVersion:version,baseUrl:`http://127.0.0.1:${server.address().port}/fhir`}};
}
for (const version of versions) test(`reads synthetic ${version} without changing source identity`,async t=>{
 const x=await fixture(version);t.after(()=>new Promise(r=>x.server.close(r)));
 const result=await inspectSynthetic(x.config,'Observation','synthetic-001');assert.equal(result.fhirVersion,version);assert.equal(result.resourceReference,'Observation/synthetic-001');assert.deepEqual(result.resource,x.body);
 assert.equal(result.sourceSha256,createHash('sha256').update(JSON.stringify(x.body)).digest('hex'));assert.deepEqual(x.requests,['/fhir/metadata','/fhir/Observation/synthetic-001']);
});
test('version mismatch refuses before resource read',async t=>{const x=await fixture('4.3.0',{version:'5.0.0'});t.after(()=>new Promise(r=>x.server.close(r)));await assert.rejects(inspectSynthetic(x.config,'Observation','synthetic-001'),/FHIR_VERSION_MISMATCH/);assert.deepEqual(x.requests,['/fhir/metadata']);});
test('unadvertised read and wrong returned identity are refused',async t=>{const a=await fixture('4.0.1',{advertised:'update'}), b=await fixture('5.0.0',{id:'other'});t.after(()=>Promise.all([a,b].map(x=>new Promise(r=>x.server.close(r)))));await assert.rejects(inspectSynthetic(a.config,'Observation','synthetic-001'),/READ_NOT_ADVERTISED/);assert.deepEqual(a.requests,['/fhir/metadata']);await assert.rejects(inspectSynthetic(b.config,'Observation','synthetic-001'),/SOURCE_IDENTITY_MISMATCH/);});
test('rejects non-synthetic sources, remote endpoints, traversal and non-R5 selection',async()=>{
 const c={dataClass:'synthetic',sourceId:'synthetic-r4b',fhirVersion:'4.3.0',baseUrl:'http://127.0.0.1:12345/fhir'};
 await assert.rejects(inspectSynthetic({...c,dataClass:'real'},'Observation','synthetic-001'),/SOURCE_NOT_ADMITTED/);
 await assert.rejects(inspectSynthetic({...c,baseUrl:'http://example.com:80/fhir'},'Observation','synthetic-001'),/SOURCE_NOT_LOOPBACK/);
 await assert.rejects(inspectSynthetic(c,'Observation','../secret'),/RESOURCE_NOT_ADMITTED/);
 await assert.rejects(inspectSynthetic(c,'Observation','..'),/RESOURCE_NOT_ADMITTED/);
 await assert.rejects(inspectSynthetic(c,'Observation','.'),/RESOURCE_NOT_ADMITTED/);
 await assert.rejects(inspectSynthetic(c,'ImagingSelection','synthetic-001'),/RESOURCE_NOT_ADMITTED/);
 await assert.rejects(inspectSynthetic(c,'Basic','synthetic-001'),/RESOURCE_NOT_ADMITTED/);
});

test('refuses redirects, denied access, malformed JSON and oversized responses',async t=>{
 for (const kind of ['redirect','denied','invalid','invalid-utf8','large']) {
  let hit=0; const server=createServer((req,res)=>{hit++; if(kind==='redirect'){res.writeHead(302,{Location:'http://127.0.0.1:'+server.address().port+'/not-allowed'});res.end();}
   else if(kind==='denied'){res.writeHead(401);res.end('{}');}
   else if(kind==='invalid')res.end('{');else if(kind==='invalid-utf8')res.end(Buffer.from([0xff]));else res.end('x'.repeat(1048577));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const config={dataClass:'synthetic',sourceId:'synthetic-r4b',fhirVersion:'4.3.0',baseUrl:`http://127.0.0.1:${server.address().port}/fhir`};
  await assert.rejects(inspectSynthetic(config,'Observation','one'), kind==='redirect'?/SOURCE_HTTP_302/:kind==='denied'?/SOURCE_HTTP_401/:(kind==='invalid'||kind==='invalid-utf8')?/INVALID_JSON/:/SOURCE_TOO_LARGE/);
  assert.equal(hit,1);
 }
});

test('simultaneous versions retain their own source identity',async t=>{
 const sources=await Promise.all(versions.map(v=>fixture(v)));t.after(()=>Promise.all(sources.map(x=>new Promise(r=>x.server.close(r)))));
 const results=await Promise.all(sources.map(x=>inspectSynthetic(x.config,'Observation','synthetic-001')));
 assert.deepEqual(results.map(x=>x.fhirVersion),versions);
 for(const source of sources)assert.deepEqual(source.requests,['/fhir/metadata','/fhir/Observation/synthetic-001']);
 assert.equal(new Set(results.map(x=>x.capabilitySha256)).size,3);
 assert.equal(new Set(results.map(x=>x.sourceFingerprint)).size,3);
 assert.deepEqual(results.map(x=>x.sourceId),versions.map(v=>'synthetic-'+v));
});
