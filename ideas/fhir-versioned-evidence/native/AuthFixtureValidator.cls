/// Synthetic research review only; never authorizes an anatomical selection.
Class DICOM3DAI.FHIR.AuthFixtureValidator
{
ClassMethod Validate(answer As %String, evidence As %DynamicObject) As %DynamicObject
{
    Set result={"outcome":"REVIEW_REQUIRED","reason":"EVIDENCE_NOT_ACCEPTED"}
    If '$IsObject(evidence) Quit result
    If (evidence.reason'="CONSISTENT_IDENTITIES_REVIEW_REQUIRED") || (evidence.semanticId'="synthetic.structure.001") Quit result
    Set failed=0
    Try { Set parsed={}.%FromJSON(answer) } Catch ex { Set failed=1 }
    If failed Quit {"outcome":"REVIEW_REQUIRED","reason":"INVALID_AGENT_RESPONSE"}
    Try {
        Set refs=parsed.citations
        If (parsed.disposition'="REVIEW_REQUIRED") || (parsed.semanticId'=evidence.semanticId) || (parsed.explanation="") || (parsed.limitation="") || '$IsObject(refs) || (refs.%Size()'=2) || (refs.%Get(0)'="Observation/synthetic-001") || (refs.%Get(1)'=evidence.evidenceReference) {
            Set result.reason="UNSUPPORTED_CITATION_OR_IDENTITY"
        } Else {
            Set result.reason="VALIDATED_SYNTHETIC_REVIEW",result.semanticId=evidence.semanticId,result.evidenceReference=evidence.evidenceReference
            Do result.%Set("citations",refs),result.%Set("explanation",parsed.explanation),result.%Set("limitation",parsed.limitation)
        }
    } Catch ex { Set result.reason="INVALID_AGENT_RESPONSE" }
    Quit result
}
}
