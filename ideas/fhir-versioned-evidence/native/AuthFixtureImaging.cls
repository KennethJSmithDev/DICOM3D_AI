/// Diagnostic synthetic fixture only; no native-agent or viewer authorization.
Class DICOM3DAI.FHIR.AuthFixtureImaging
{
ClassMethod Extension(items As %DynamicArray, name As %String, field As %String) As %String
{
    Set count=0,result=""
    If '$IsObject(items) Quit ""
    For i=0:1:items.%Size()-1 {
        Set item=items.%Get(i)
        If item.url=name { Set count=count+1,result=item.%Get(field) }
    }
    If count'=1 Quit ""
    Quit result
}
ClassMethod Normalize(item As %DynamicObject, version As %String) As %DynamicObject
{
    Set result={"valid":false},ext="http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection"
    If version="5.0.0" {
        If (item.resourceType'="ImagingSelection") || (item.status'="available") || '$IsObject(item.derivedFrom) || (item.derivedFrom.%Size()'=1) Quit result
        If $IsObject(item.modifierExtension) && item.modifierExtension.%Size() Quit result
        Set result.study=item.studyUid,result.frame=item.frameOfReferenceUid,result.source=item.derivedFrom.%Get(0).reference
    } Else {
        If item.resourceType'="Basic" Quit result
        If '$IsObject(item.meta.profile) || (item.meta.profile.%Size()'=1) Quit result
        If version="4.0.1" {
            If item.meta.profile.%Get(0)'="http://hl7.org/fhir/4.0/StructureDefinition/R5-ImagingSelection-for-R4" Quit result
            If $IsObject(item.modifierExtension) && item.modifierExtension.%Size() Quit result
            If '$IsObject(item.code.coding) || (item.code.coding.%Size()'=1) Quit result
            Set coding=item.code.coding.%Get(0)
            If (coding.system'="http://hl7.org/fhir/fhir-types") || (coding.code'="ImagingSelection") Quit result
            If '$IsObject(item.extension) || (item.extension.%Size()'=1) Quit result
            Set outer=item.extension.%Get(0)
            If outer.url'=ext Quit result
            Set list=outer.extension,prefix=""
        } Else {
            If item.meta.profile.%Get(0)'="http://hl7.org/fhir/5.0/StructureDefinition/profile-ImagingSelection" Quit result
            If '$IsObject(item.modifierExtension) || (item.modifierExtension.%Size()'=1) Quit result
            Set mod=item.modifierExtension.%Get(0)
            If (mod.url'=(ext_".status")) || (mod.valueCode'="available") Quit result
            Set list=item.extension,prefix=ext_"."
        }
        If version="4.0.1",(..Extension(list,"status","valueCode")'="available") Quit result
        Set result.study=..Extension(list,prefix_"studyUid","valueId"),result.frame=..Extension(list,prefix_"frameOfReferenceUid","valueId")
        Set count=0,source=""
        If '$IsObject(list) Quit result
        For i=0:1:list.%Size()-1 { Set entry=list.%Get(i) If entry.url=(prefix_"derivedFrom") { Set count=count+1,source=entry.valueReference.reference } }
        If count'=1 Quit result
        Set result.source=source
    }
    If (result.study="") || (result.frame="") || (result.source="") Quit result
    Set result.valid=1
    Quit result
}
ClassMethod Inspect(pathVersion As %String, expectedVersion As %String) As %DynamicObject
{
    Set prefix=$Select(pathVersion="R4":"/imaging/r4",pathVersion="R4B":"/imaging/r4b",pathVersion="R5":"/imaging/r5",pathVersion="MISMATCH":"/imaging/mismatch",pathVersion="TAMPER":"/imaging/tamper",1:"")
    Set result={"outcome":"REVIEW_REQUIRED","reason":"SOURCE_REFUSED"}
    If (prefix="") || ('$ListFind($ListBuild("4.0.1","4.3.0","5.0.0"),expectedVersion)) Quit result
    Try {
        Set md=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/metadata")
        If (md.resourceType'="CapabilityStatement") || (md.fhirVersion'=expectedVersion) { Set result.reason="FHIR_VERSION_MISMATCH" }
        Else {
            Set ct=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/ImagingStudy/ct"),seg=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/ImagingStudy/seg")
            Set kind=$Select(expectedVersion="5.0.0":"ImagingSelection",1:"Basic")
            Set select=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/"_kind_"/seg-sel"),context=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/"_kind_"/ct-sel")
            Set obs=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/Observation/synthetic-001"),sel=..Normalize(select,expectedVersion),ctx=..Normalize(context,expectedVersion)
            Set result.reason="IDENTITY_OR_PROFILE_MISMATCH"
            If (ct.resourceType="ImagingStudy") && (ct.id="ct") && (ct.status="available") && (seg.resourceType="ImagingStudy") && (seg.id="seg") && (seg.status="available") && (obs.resourceType="Observation") && (obs.id="synthetic-001") && (obs.status="final") && (select.id="seg-sel") && (context.id="ct-sel") && sel.valid && ctx.valid {
                Set study=ct.identifier.%Get(0).value,segstudy=seg.identifier.%Get(0).value,subject=ct.subject.reference
                If (study'=segstudy) || (study'=("urn:oid:"_sel.study)) || (sel.study'=ctx.study) || (sel.frame'=ctx.frame) { Set result.reason="STUDY_OR_FRAME_MISMATCH" }
                ElseIf (subject'="") && (seg.subject.reference=subject) && (select.subject.reference=subject) && (context.subject.reference=subject) && (obs.subject.reference=subject) && (sel.source="ImagingStudy/seg") && (ctx.source="ImagingStudy/ct") && (select.identifier.%Get(0).value="synthetic.structure.001") && (obs.focus.%Get(0).reference=(kind_"/seg-sel")) && (obs.derivedFrom.%Size()=2) && (obs.derivedFrom.%Get(0).reference=(kind_"/seg-sel")) && (obs.derivedFrom.%Get(1).reference=(kind_"/ct-sel")) {
                    Set result.reason="CONSISTENT_IDENTITIES_REVIEW_REQUIRED",result.fhirVersion=expectedVersion,result.semanticId="synthetic.structure.001",result.evidenceReference=kind_"/seg-sel"
                }
            }
        }
    } Catch ex { Set result.reason="SOURCE_READ_OR_PARSE_FAILED" }
    Quit result
}
}
