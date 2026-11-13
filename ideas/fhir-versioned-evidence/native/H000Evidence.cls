/// Research-only H000 fixture inspection. The fixture reader must independently pin and scope every response.
Class DICOM3DAI.FHIR.H000Evidence
{
ClassMethod Inspect(route As %String, version As %String) As %DynamicObject
{
    Set result={"outcome":"REVIEW_REQUIRED","reason":"SOURCE_REFUSED"}
    Set prefix=$Select(route="R4":"/h000/r4",route="R4B":"/h000/r4b",route="R5":"/h000/r5",1:"")
    If (prefix="") || (version'=$Select(route="R4":"4.0.1",route="R4B":"4.3.0",route="R5":"5.0.0",1:"")) Quit result
    Try { Set result=..InspectInner(prefix,version) } Catch ex { Set result.reason="SOURCE_READ_OR_PARSE_FAILED" }
    Quit result
}
ClassMethod InspectInner(prefix As %String, version As %String) As %DynamicObject
{
    Set result={"outcome":"REVIEW_REQUIRED","reason":"SOURCE_REFUSED"}
    Set binding=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON("/h000/source-binding")
    Set md=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/metadata")
    If (md.resourceType'="CapabilityStatement") || (md.fhirVersion'=version) { Set result.reason="FHIR_VERSION_MISMATCH" Quit result }
    Set ct=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/ImagingStudy/r5p-h000-ct"),seg=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/ImagingStudy/r5p-h000-seg")
    Set kind=$Select(version="5.0.0":"ImagingSelection",1:"Basic")
    Set selected=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/"_kind_"/r5p-h000-segment-1"),context=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/"_kind_"/r5p-h000-ct-context")
    Set observation=##class(DICOM3DAI.FHIR.AuthFixtureReader).ReadJSON(prefix_"/Observation/r5p-h000-mask-volume")
    If (ct.id'="r5p-h000-ct") || (seg.id'="r5p-h000-seg") || (ct.status'="available") || (seg.status'="available") || (selected.id'="r5p-h000-segment-1") || (context.id'="r5p-h000-ct-context") Quit result
    Set result=##class(DICOM3DAI.FHIR.H000Binding).Check(ct,seg,selected,context,binding,"lesion.lung.mass.001",version)
    If result.reason'="CONSISTENT_INSTANCE_BINDING_REVIEW_REQUIRED" Quit result
    Set result.reason="OBSERVATION_REFERENCE_MISMATCH"
    If (observation.resourceType'="Observation") || (observation.id'="r5p-h000-mask-volume") || (observation.status'="final") || (observation.subject.reference'=ct.subject.reference) Quit result
    If '$IsObject(observation.focus) || (observation.focus.%Size()'=1) || (observation.focus.%Get(0).reference'=(kind_"/r5p-h000-segment-1")) Quit result
    If '$IsObject(observation.derivedFrom) || (observation.derivedFrom.%Size()'=2) Quit result
    Set first=observation.derivedFrom.%Get(0).reference,second=observation.derivedFrom.%Get(1).reference
    If '(((first=(kind_"/r5p-h000-segment-1")) && (second=(kind_"/r5p-h000-ct-context"))) || ((second=(kind_"/r5p-h000-segment-1")) && (first=(kind_"/r5p-h000-ct-context")))) Quit result
    Set result.reason="SOURCE_BOUND_H000_REVIEW_REQUIRED",result.semanticId="lesion.lung.mass.001",result.fhirVersion=version,result.evidenceReference=kind_"/r5p-h000-segment-1"
    // Only the exact R5 research fixture is admitted for this viewer witness.
    // R4/R4B projections remain review-only and do not authorize selection.
    If version="5.0.0" Set result.outcome="SOURCE_VERIFIED",result.reason="SOURCE_BOUND_H000_VERIFIED"
    Quit result
}
}
