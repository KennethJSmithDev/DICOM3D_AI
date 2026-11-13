// Synthetic-only, read-only local source inspection; no patient or agent access.
import { createHash } from 'node:crypto';
const releases = new Set(['4.0.1','4.3.0','5.0.0']);
const common = new Set(['ImagingStudy','Observation','DiagnosticReport']);
const id = /^[A-Za-z0-9.-]{1,64}$/;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function source(input) {
  if (!input || input.dataClass !== 'synthetic' || !releases.has(input.fhirVersion) || typeof input.sourceId !== 'string' || !id.test(input.sourceId)) throw new Error('SOURCE_NOT_ADMITTED');
  if (typeof input.baseUrl !== 'string' || input.baseUrl.length > 256) throw new Error('INVALID_SOURCE');
  let u; try { u = new URL(input.baseUrl); } catch { throw new Error('INVALID_SOURCE'); }
  if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || !u.port || u.username || u.password || u.search || u.hash || !/^\/[A-Za-z0-9_/-]*$/.test(u.pathname) || u.pathname.includes('//') || u.pathname.includes('..')) throw new Error('SOURCE_NOT_LOOPBACK');
  const url=u.href.replace(/\/$/,'');
  return {url,version:input.fhirVersion,sourceId:input.sourceId,sourceFingerprint:digest(Buffer.from(url+'\n'+input.fhirVersion))};
}
async function get(base, path) {
  const response = await fetch(base + path,{method:'GET',redirect:'manual',headers:{Accept:'application/fhir+json'},signal:AbortSignal.timeout(5000)});
  if (response.status !== 200) throw new Error('SOURCE_HTTP_'+response.status);
  const chunks=[]; let bytes=0;
  for await (const part of response.body) { bytes+=part.length; if (bytes>1048576) { await response.body.cancel().catch(()=>{}); throw new Error('SOURCE_TOO_LARGE'); } chunks.push(part); }
  const body=Buffer.concat(chunks.map(x=>Buffer.from(x)),bytes);
  let json; try { json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body)); } catch { throw new Error('INVALID_JSON'); }
  return {json,sha256:digest(body),bytes:body.length,originalBytes:body};
}
export async function inspectSynthetic(config, type, logicalId) {
  const admitted=source(config);
  if (typeof logicalId!=='string' || !id.test(logicalId) || logicalId==='.' || logicalId==='..' || typeof type!=='string' || !(common.has(type) || (admitted.version==='5.0.0' && type==='ImagingSelection'))) throw new Error('RESOURCE_NOT_ADMITTED');
  const capability=await get(admitted.url,'/metadata');
  if (capability.json?.resourceType!=='CapabilityStatement' || capability.json.fhirVersion!==admitted.version) throw new Error('FHIR_VERSION_MISMATCH');
  const server=capability.json.rest;
  if (!Array.isArray(server) || !server.some(s=>s?.mode==='server' && Array.isArray(s.resource) && s.resource.some(r=>r?.type===type && Array.isArray(r.interaction) && r.interaction.some(i=>i?.code==='read')))) throw new Error('READ_NOT_ADVERTISED');
  const raw=await get(admitted.url,`/${type}/${logicalId}`);
  if (raw.json?.resourceType!==type || raw.json?.id!==logicalId) throw new Error('SOURCE_IDENTITY_MISMATCH');
  return {sourceId:admitted.sourceId,sourceFingerprint:admitted.sourceFingerprint,fhirVersion:admitted.version,resourceReference:`${type}/${logicalId}`,capabilitySha256:capability.sha256,sourceSha256:raw.sha256,resource:raw.json,scope:'synthetic-local-read-only; no patient matching, mapping, profile validation or selection'};
}

// An isolated synthetic fixture must be pinned independently before it can be
// inspected. A hash proves content identity, not the identity of the listener.
export async function inspectPinnedSynthetic(config, record) {
  const admitted=source(config);
  if (!record || typeof record.type !== 'string' || typeof record.id !== 'string' || !id.test(record.id) || record.id==='.' || record.id==='..' ||
      typeof record.versionId !== 'string' || !id.test(record.versionId) ||
      typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) throw new Error('INVALID_PIN');
  const allowed=common.has(record.type) || (admitted.version==='5.0.0' && record.type==='ImagingSelection') ||
    (admitted.version!=='5.0.0' && record.type==='Basic');
  if (!allowed) throw new Error('RESOURCE_NOT_ADMITTED');
  const capability=await get(admitted.url,'/metadata');
  if (capability.json?.resourceType!=='CapabilityStatement' || capability.json.fhirVersion!==admitted.version) throw new Error('FHIR_VERSION_MISMATCH');
  if (!Array.isArray(capability.json.rest) || !capability.json.rest.some(s=>s?.mode==='server' && Array.isArray(s.resource) && s.resource.some(r=>r?.type===record.type && Array.isArray(r.interaction) && r.interaction.some(i=>i?.code==='read')))) throw new Error('READ_NOT_ADVERTISED');
  const raw=await get(admitted.url,`/${record.type}/${record.id}`);
  if (raw.json?.resourceType!==record.type || raw.json?.id!==record.id || raw.json?.meta?.versionId!==record.versionId) throw new Error('SOURCE_IDENTITY_MISMATCH');
  if (raw.sha256!==record.sha256) throw new Error('SOURCE_CONTENT_MISMATCH');
  return {sourceId:admitted.sourceId,sourceFingerprint:admitted.sourceFingerprint,fhirVersion:admitted.version,
    resourceReference:`${record.type}/${record.id}`,capabilitySha256:capability.sha256,sourceSha256:raw.sha256,
    originalBytes:raw.originalBytes,resource:raw.json};
}
