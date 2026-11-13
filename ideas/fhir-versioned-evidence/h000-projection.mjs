// Research-only selected-field projections of the retained H000 R5 fixture.
// These are derived resources, not original R4/R4B server observations.
const ext='http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection';
export function projectH000Selection(original,version) {
 if(version==='5.0.0') return structuredClone(original);
 if(version!=='4.0.1' && version!=='4.3.0') throw new Error('UNSUPPORTED_VERSION');
 const fields=[{url:'studyUid',valueId:original.studyUid},{url:'seriesUid',valueId:original.seriesUid},
  {url:'frameOfReferenceUid',valueId:original.frameOfReferenceUid},{url:'derivedFrom',valueReference:original.derivedFrom[0]},
  ...original.instance.map(i=>({url:'instance',extension:[{url:'uid',valueId:i.uid},{url:'sopClass',valueCoding:i.sopClass},...(i.subset??[]).map(valueString=>({url:'subset',valueString}))]}))];
 const base={resourceType:'Basic',id:original.id,meta:{versionId:'1',profile:[version==='4.0.1'?'http://hl7.org/fhir/4.0/StructureDefinition/R5-ImagingSelection-for-R4':'http://hl7.org/fhir/5.0/StructureDefinition/profile-ImagingSelection']},subject:original.subject};
 if(original.identifier) base.identifier=original.identifier;
 if(version==='4.0.1') return {...base,code:{coding:[{system:'http://hl7.org/fhir/fhir-types',code:'ImagingSelection'}]},extension:[{url:ext,extension:[{url:'status',valueCode:'available'},...fields]}]};
 return {...base,code:{text:'Research projection of ImagingSelection'},modifierExtension:[{url:ext+'.status',valueCode:'available'}],extension:[{url:ext+'.code',valueCodeableConcept:original.code??{text:'Research selection'}},...fields.map(x=>({...x,url:ext+'.'+x.url}))]};
}
