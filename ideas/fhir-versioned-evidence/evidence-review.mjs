import {createHash} from 'node:crypto';
import {inspectSelectionProfile} from './selection-profile.mjs';
import {inspectInstanceBinding} from './instance-binding.mjs';

const review=reason=>({outcome:'REVIEW_REQUIRED',reason});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const uid=r=>{
  const values=Array.isArray(r?.identifier) ? r.identifier.filter(x=>x?.system==='urn:dicom:uid').map(x=>x.value) : [];
  return values.length===1 && /^urn:oid:[0-9]+(?:\.[0-9]+)+$/.test(values[0]) ? values[0].slice(8) : null;
};
const references=values=>Array.isArray(values) ? values.map(x=>x?.reference) : [];

// Diagnostic consistency only. Never return an authorization to select.
// The caller must independently scope and authenticate sources and validate profiles.
export function inspectEvidenceRelationships({ct,seg,selection,context,observation,semanticId,sourceBinding}={}) {
  const records=[ct,seg,selection,context,observation];
  if (records.some(x=>!x || !Buffer.isBuffer(x.originalBytes) || !/^[a-f0-9]{64}$/.test(x.sourceSha256 ?? '') || hash(x.originalBytes)!==x.sourceSha256)) return review('SOURCE_BYTES_UNVERIFIED');
  for(const x of records) {
    let raw;try {raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(x.originalBytes));} catch {return review('SOURCE_BYTES_INVALID');}
    if (JSON.stringify(raw)!==JSON.stringify(x.resource) || x.resourceReference!==`${raw.resourceType}/${raw.id}`) return review('SOURCE_PROJECTION_MISMATCH');
  }
  if (!ct.sourceId || !ct.sourceFingerprint || !ct.capabilitySha256 || records.some(x=>x.sourceId!==ct.sourceId || x.sourceFingerprint!==ct.sourceFingerprint || x.capabilitySha256!==ct.capabilitySha256 || x.fhirVersion!==ct.fhirVersion)) return review('SOURCE_SCOPE_MISMATCH');
  if (ct.resource.resourceType!=='ImagingStudy' || seg.resource.resourceType!=='ImagingStudy' || observation.resource.resourceType!=='Observation') return review('RESOURCE_TYPE_MISMATCH');
  if (records.some(x=>x.resource.implicitRules || (Array.isArray(x.resource.modifierExtension) && x.resource.modifierExtension.length && x!==selection && x!==context))) return review('UNSUPPORTED_MODIFIER');
  if (ct.resource.status!=='available' || seg.resource.status!=='available' || observation.resource.status!=='final') return review('STATUS_UNAVAILABLE');
  const sel=inspectSelectionProfile(selection), ctx=inspectSelectionProfile(context);
  if (sel.reason!=='RELATIONSHIP_VALIDATION_REQUIRED' || ctx.reason!=='RELATIONSHIP_VALIDATION_REQUIRED') return review('SELECTION_REPRESENTATION_UNSUPPORTED');
  const subject=ct.resource.subject?.reference;
  if (!subject || records.some(x=>x.resource.subject?.reference!==subject)) return review('SUBJECT_MISMATCH');
  const ids=Array.isArray(selection.resource.identifier) ? selection.resource.identifier.filter(x=>x?.system==='urn:dicom3d:research:evidence').map(x=>x.value) : [];
  if (typeof semanticId!=='string' || !semanticId || ids.length!==1 || ids[0]!==semanticId) return review('SEMANTIC_IDENTITY_MISMATCH');
  const study=uid(ct.resource);
  if (!study || study!==uid(seg.resource) || study!==sel.studyUid || study!==ctx.studyUid || !sel.frameOfReferenceUid || sel.frameOfReferenceUid!==ctx.frameOfReferenceUid) return review('STUDY_OR_FRAME_MISMATCH');
  if (sel.sourceStudy!==seg.resourceReference || ctx.sourceStudy!==ct.resourceReference) return review('STUDY_REFERENCE_MISMATCH');
  const focus=references(observation.resource.focus), derived=references(observation.resource.derivedFrom);
  if (focus.length!==1 || focus[0]!==selection.resourceReference || derived.length!==2 || !derived.includes(selection.resourceReference) || !derived.includes(context.resourceReference)) return review('OBSERVATION_REFERENCE_MISMATCH');
  const bindingFailure=inspectInstanceBinding({ct,seg,selection,context,semanticId,sourceBinding});
  if (bindingFailure) return review(bindingFailure);
  let binding;
  try { binding=JSON.parse(sourceBinding.originalBytes.toString('utf8')); } catch { return review('SOURCE_BINDING_INVALID'); }
  if (binding.source.source_study_uid!==study || binding.source.frame_of_reference_uid!==sel.frameOfReferenceUid) return review('SOURCE_BINDING_STUDY_MISMATCH');
  return {outcome:'REVIEW_REQUIRED',reason:'CONSISTENT_IDENTITIES_NOT_SELECTION_AUTHORIZATION',sourceId:ct.sourceId,
    fhirVersion:ct.fhirVersion,semanticId,citations:[observation.resourceReference,selection.resourceReference]};
}
