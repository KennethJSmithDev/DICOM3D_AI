import {createHash} from 'node:crypto';

const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
const uid=s=>typeof s==='string' && /^[0-9]+(?:\.[0-9]+)+$/.test(s);
const one=(items,name,key)=>{
  if (!Array.isArray(items)) return undefined;
  const matches=items.filter(x=>x?.url===name);
  return matches.length===1 ? matches[0]?.[key] : undefined;
};
const sameSet=(a,b)=>Array.isArray(a) && Array.isArray(b) && a.length>0 && a.length===b.length &&
  new Set(a).size===a.length && new Set(b).size===b.length && a.every(x=>b.includes(x));
const classCode=c=>c?.system==='urn:ietf:rfc:3986' && typeof c?.code==='string' && c.code.startsWith('urn:oid:') ? c.code.slice(8) : undefined;

// Extract only the fields required for source binding. This is not a profile validator.
function selectionInstances(record) {
  const r=record.resource, version=record.fhirVersion;
  if (version==='5.0.0') return {series:r.seriesUid, instances:r.instance};
  const container=version==='4.0.1' ? r.extension?.find(x=>x?.url===ext)?.extension : r.extension;
  if (!Array.isArray(container)) return {};
  const prefix=version==='4.0.1' ? '' : ext+'.';
  const series=one(container,prefix+'seriesUid','valueId');
  const instances=container.filter(x=>x?.url===prefix+'instance').map(x=>{
    const parts=x.extension;
    if (!Array.isArray(parts)) return null;
    return {uid:one(parts,'uid','valueId'),sopClass:one(parts,'sopClass','valueCoding'),
      subset:parts.filter(p=>p?.url==='subset').map(p=>p.valueString)};
  });
  return {series,instances};
}

// The caller must pin and authenticate the binding independently. Matching a
// supplied digest proves byte consistency only, not the binding's authority.
export function inspectInstanceBinding({ct,seg,selection,context,semanticId,sourceBinding}) {
  if (!Buffer.isBuffer(sourceBinding?.originalBytes) || !/^[a-f0-9]{64}$/.test(sourceBinding.sourceSha256 ?? '') ||
      createHash('sha256').update(sourceBinding.originalBytes).digest('hex')!==sourceBinding.sourceSha256) return 'SOURCE_BINDING_REQUIRED';
  let binding;
  try { binding=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(sourceBinding.originalBytes)); }
  catch { return 'SOURCE_BINDING_INVALID'; }
  const src=binding.source, structure=binding.structure, frames=binding.frames;
  if (!src || !structure || !Array.isArray(frames) || structure.semantic_id!==semanticId ||
      !Number.isSafeInteger(structure.source?.segment_number) || structure.source.segment_number<1 ||
      ![src.source_study_uid,src.frame_of_reference_uid,src.ct_series_uid,src.segmentation_series_uid,src.segmentation_sop_uid].every(uid)) return 'SOURCE_BINDING_INVALID';
  if (!Array.isArray(ct.resource.series) || ct.resource.series.length!==1 || !Array.isArray(seg.resource.series) || seg.resource.series.length!==1) return 'SERIES_BINDING_MISMATCH';
  const ctSeries=ct.resource.series[0],segSeries=seg.resource.series[0];
  const s=selectionInstances(selection),c=selectionInstances(context);
  if (ctSeries.uid!==src.ct_series_uid || c.series!==src.ct_series_uid || segSeries.uid!==src.segmentation_series_uid || s.series!==src.segmentation_series_uid) return 'SERIES_BINDING_MISMATCH';
  const ctSops=Array.isArray(ctSeries.instance)?ctSeries.instance.map(x=>x?.uid):[];
  const boundSops=frames.map(x=>x?.ct_sop_uid), occupied=frames.filter(x=>Number.isInteger(x?.nonzero_voxels)&&x.nonzero_voxels>0).map(x=>x.ct_sop_uid);
  if (!boundSops.every(uid) || !sameSet(ctSops,boundSops) || ctSeries.numberOfInstances!==ctSops.length) return 'CT_INSTANCE_MISMATCH';
  if (!Array.isArray(c.instances) || !sameSet(c.instances.map(x=>x?.uid),occupied)) return 'CT_CONTEXT_INSTANCE_MISMATCH';
  if (!Array.isArray(segSeries.instance) || segSeries.numberOfInstances!==1 || segSeries.instance.length!==1 || !Array.isArray(s.instances) || s.instances.length!==1 || segSeries.instance[0]?.uid!==src.segmentation_sop_uid || s.instances[0]?.uid!==src.segmentation_sop_uid) return 'SEG_INSTANCE_MISMATCH';
  const ctClass='1.2.840.10008.5.1.4.1.1.2',segClass='1.2.840.10008.5.1.4.1.1.66.4';
  if (ctSeries.instance.some(x=>classCode(x.sopClass)!==ctClass) || c.instances.some(x=>classCode(x?.sopClass)!==ctClass) || classCode(segSeries.instance[0].sopClass)!==segClass || classCode(s.instances[0].sopClass)!==segClass) return 'SOP_CLASS_MISMATCH';
  if (c.instances.some(x=>x?.subset!==undefined && (!Array.isArray(x.subset) || x.subset.length)) || !sameSet(s.instances[0].subset,[String(structure.source.segment_number)])) return 'SEG_SUBSET_MISMATCH';
  if (src.source_study_uid!==selection.resource.studyUid && selection.fhirVersion==='5.0.0') return 'SOURCE_BINDING_STUDY_MISMATCH';
  return null;
}
