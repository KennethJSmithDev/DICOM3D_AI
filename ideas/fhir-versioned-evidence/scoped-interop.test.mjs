import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {loadInterop} from './isaiah-scoped-interop.mjs';
const sha = x => createHash('sha256').update(x).digest('hex');
for (const version of ['4.0.1','4.3.0','5.0.0']) test(`ISAIAH scoped FHIR reader: ${version}`,async t=>{
 const object={resourceType:'Observation',id:'synthetic-001',meta:{versionId:'1'},status:'final',valueString:'synthetic'};
 const original=JSON.stringify(object);let scenario='good';const calls=[];
 const server=createServer((req,res)=>{calls.push(req.url);assert.equal(req.method,'GET');assert.equal(req.headers.authorization,'Basic '+Buffer.from('test-user:test-only-password').toString('base64'));
  if(scenario==='redirect'){res.writeHead(302,{Location:'http://example.invalid/'});return res.end();}
  res.setHeader('Content-Type','application/fhir+json');
  if(req.url.endsWith('/metadata')) return res.end(JSON.stringify({resourceType:'CapabilityStatement',fhirVersion:scenario==='version'?'0.0.0':version}));
  res.end(scenario==='identity'?JSON.stringify({...object,id:'other'}):scenario==='hash'?JSON.stringify({...object,valueString:'changed'}):original);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const dir=await mkdtemp(join(tmpdir(),'dicom3d-fhir-versioned-'));
 const profile=[{id:'synthetic-fhir',kind:'fhir',instance:'configured-fixture',origin:`http://127.0.0.1:${server.address().port}`,base:'/fhir/',version,records:[{key:'observation',type:'Observation',id:'synthetic-001',version:'1',sha256:sha(original)}]}];
 const pf=join(dir,'profile.json'),cf=join(dir,'credentials.json');await writeFile(pf,JSON.stringify(profile));await writeFile(cf,JSON.stringify({'synthetic-fhir':{username:'test-user',password:'test-only-password'}}));
 const reader=await loadInterop(pf,cf);const output=await reader.inspect('synthetic-fhir','observation');
 assert.equal(output.verification.status,'pass');assert.equal(output.verification.receipt.sha256,sha(original));assert.equal(output.target.version,version);assert.equal(output.productionDeliveryClaim,false);assert.ok(!JSON.stringify(output).includes('test-only-password'));
 const before=calls.length;await assert.rejects(reader.inspect('other','observation'),/outside/);assert.equal(calls.length,before);
 for(scenario of ['version','identity','hash','redirect']) await assert.rejects(reader.inspect('synthetic-fhir','observation'));
});
