/// Exact output gate; source and tool checks must succeed before it accepts.
Class DICOM3DAI.FHIR.H000AgentValidator
{
ClassMethod Validate(answer As %String, evidence As %DynamicObject, toolVerified As %Boolean = 0) As %DynamicObject
{
    Set result={"status":"REVIEW_REQUIRED","reason":"SOURCE_OR_TOOL_NOT_VERIFIED"}
    If 'toolVerified || '$IsObject(evidence) Quit result
    If (evidence.outcome'="SOURCE_VERIFIED") || (evidence.reason'="SOURCE_BOUND_H000_VERIFIED") || (evidence.semanticId'="lesion.lung.mass.001") || (evidence.fhirVersion'="5.0.0") || (evidence.evidenceReference'="ImagingSelection/r5p-h000-segment-1") Quit result
    Set result.reason="INVALID_AGENT_RESPONSE"
    Set failed=0
    Try { Set parsed={}.%FromJSON(answer) } Catch ex { Set failed=1 }
    If failed Quit result
    Try {
        Set refs=parsed.citations
        If (parsed.semanticId'="lesion.lung.mass.001") || (parsed.explanation="") || (parsed.limitation="") || '$IsObject(refs) || (refs.%Size()'=2) || (refs.%Get(0)'="Observation/r5p-h000-mask-volume") || (refs.%Get(1)'="ImagingSelection/r5p-h000-segment-1") {
            Set result.reason="UNSUPPORTED_CITATION_OR_IDENTITY"
        } Else {
            Set result.status="ACCEPTED",result.reason="VALIDATED_SOURCE_BOUND_DECISION",result.semanticId=parsed.semanticId,result.explanation=parsed.explanation,result.limitation=parsed.limitation
            Do result.%Set("citations",refs)
        }
    } Catch ex { Set result.reason="INVALID_AGENT_RESPONSE" }
    Quit result
}
}
