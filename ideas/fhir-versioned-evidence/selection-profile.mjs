// Research inspection only: profile declarations are not validation or consent.
// This projection never authorizes viewer selection or native-agent citations.
const r4Profile='http://hl7.org/fhir/4.0/StructureDefinition/R5-ImagingSelection-for-R4';
const r4bProfile='http://hl7.org/fhir/5.0/StructureDefinition/profile-ImagingSelection';
const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
const review = reason => ({outcome:'REVIEW_REQUIRED',reason});
const unique = (entries,url,key) => {
  if (!Array.isArray(entries)) return undefined;
  const matches=entries.filter(x=>x?.url===url);
  return matches.length===1 && typeof matches[0][key]==='string' ? matches[0][key] : undefined;
};

export function inspectSelectionProfile(receipt) {
  const r=receipt?.resource, version=receipt?.fhirVersion, ref=receipt?.resourceReference;
  if (!r || typeof ref!=='string' || ref!==`${r.resourceType}/${r.id}` ||
      !receipt.sourceId || !/^[a-f0-9]{64}$/.test(receipt.sourceSha256 ?? '')) return review('INVALID_SOURCE_IDENTITY');
  const base={outcome:'REVIEW_REQUIRED',sourceId:receipt.sourceId,fhirVersion:version,
    sourceReference:ref,sourceSha256:receipt.sourceSha256};
  if (r.implicitRules) return {...base,reason:'IMPLICIT_RULES_UNSUPPORTED'};
  if (version==='4.0.1' && r.resourceType==='Basic') {
    if (!Array.isArray(r.meta?.profile) || !r.meta.profile.includes(r4Profile)) return {...base,reason:'PROFILE_NOT_DECLARED'};
    if ((r.modifierExtension?.length ?? 0)>0) return {...base,reason:'MODIFIER_UNSUPPORTED'};
    const code=r.code?.coding?.some(c=>c?.system==='http://hl7.org/fhir/fhir-types' && c?.code==='ImagingSelection');
    const extensions=Array.isArray(r.extension) ? r.extension.filter(e=>e?.url===ext) : [];
    if (!code || extensions.length!==1 || !Array.isArray(extensions[0].extension)) return {...base,reason:'R4_PROFILE_INCOMPLETE'};
    const nested=extensions[0].extension;
    if (unique(nested,'status','valueCode')!=='available') return {...base,reason:'STATUS_OR_MODIFIER_UNSUPPORTED'};
    const studyUid=unique(nested,'studyUid','valueId'),frameOfReferenceUid=unique(nested,'frameOfReferenceUid','valueId');
    const refs=nested.filter(e=>e?.url==='derivedFrom');
    const sourceStudy=refs.length===1 ? refs[0]?.valueReference?.reference : undefined;
    if (!studyUid || !frameOfReferenceUid || typeof sourceStudy!=='string') return {...base,reason:'R4_PROFILE_INCOMPLETE'};
    return {...base,reason:'RELATIONSHIP_VALIDATION_REQUIRED',studyUid,frameOfReferenceUid,sourceStudy};
  }
  if (version==='4.3.0' && r.resourceType==='Basic') {
    if (!Array.isArray(r.meta?.profile) || !r.meta.profile.includes(r4bProfile)) return {...base,reason:'PROFILE_NOT_DECLARED'};
    const modifiers=r.modifierExtension;
    if (!Array.isArray(modifiers) || modifiers.length!==1 || modifiers[0]?.url!==ext+'.status' || modifiers[0]?.valueCode!=='available') return {...base,reason:'STATUS_OR_MODIFIER_UNSUPPORTED'};
    const studyUid=unique(r.extension,ext+'.studyUid','valueId');
    const frameOfReferenceUid=unique(r.extension,ext+'.frameOfReferenceUid','valueId');
    // A reference is an object in FHIR, not a string.
    const refs=Array.isArray(r.extension) ? r.extension.filter(e=>e?.url===ext+'.derivedFrom') : [];
    const sourceStudy=refs.length===1 ? refs[0]?.valueReference?.reference : undefined;
    const codes=Array.isArray(r.extension) ? r.extension.filter(e=>e?.url===ext+'.code') : [];
    if (!studyUid || !frameOfReferenceUid || typeof sourceStudy!=='string' || codes.length!==1 || !codes[0]?.valueCodeableConcept) return {...base,reason:'R4B_PROFILE_INCOMPLETE'};
    return {...base,reason:'RELATIONSHIP_VALIDATION_REQUIRED',studyUid,frameOfReferenceUid,sourceStudy};
  }
  if (version==='5.0.0' && r.resourceType==='ImagingSelection') {
    if ((r.modifierExtension?.length ?? 0)>0 || r.status!=='available') return {...base,reason:'STATUS_OR_MODIFIER_UNSUPPORTED'};
    if (!r.studyUid || !r.frameOfReferenceUid || !Array.isArray(r.derivedFrom) || r.derivedFrom.length!==1 || !r.derivedFrom[0]?.reference) return {...base,reason:'R5_SELECTION_INCOMPLETE'};
    return {...base,reason:'RELATIONSHIP_VALIDATION_REQUIRED',studyUid:r.studyUid,frameOfReferenceUid:r.frameOfReferenceUid,sourceStudy:r.derivedFrom[0].reference};
  }
  return {...base,reason:'UNSUPPORTED_REPRESENTATION'};
}
