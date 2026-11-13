Include %occStatus
/// Isolated R5 research-fixture witness. Does not qualify arbitrary FHIR sources.
Class DICOM3DAI.FHIR.H000AgentOperation Extends Ens.BusinessOperation
{
Parameter INVOCATION="Queue";
Method Review(request As DICOM3DAI.FHIR.FixtureRequest, Output response As DICOM3DAI.FHIR.FixtureResponse) As %Status
{
    Set response=##class(DICOM3DAI.FHIR.FixtureResponse).%New(),result={"status":"REVIEW_REQUIRED","reason":"AGENT_UNAVAILABLE"}
    Kill ^||DICOM3DAIH000SelectionValidated
    If (request.PathVersion'="R5") || (request.ExpectedVersion'="5.0.0") { Set result.reason="SOURCE_REFUSED",response.Payload=result.%ToJSON() Quit $$$OK }
    Try {
        Set provider=##class(%AI.Provider).Create("openai",{"api_key":"local-only","base_url":"http://127.0.0.1:53571/v1","http_config":{"request_timeout_secs":180}})
        Set agent=##class(%AI.Agent).%New(provider),agent.Model="gpt-oss:20b"
        Set agent.SystemPrompt="Use only authorized research fixture evidence. Call ReadEvidence, then SelectVerifiedStructure with lesion.lung.mass.001. Return exactly JSON with explanation, semanticId, citations array, limitation. The exact citations are Observation/r5p-h000-mask-volume and ImagingSelection/r5p-h000-segment-1. Do not diagnose or infer coordinates. State this is research evidence and not clinical advice. No markdown fences."
        Do agent.UseToolSet("DICOM3DAI.FHIR.H000Tools")
        Set session=agent.CreateSession({"max_iterations":3,"temperature":0,"max_tokens":1024}),answer=agent.Chat(session,"Explain the documented source-linked research finding.")
        Set evidence=##class(DICOM3DAI.FHIR.H000Evidence).Inspect("R5","5.0.0")
        If ($Get(^||DICOM3DAIH000SelectionValidated)=1) && (evidence.outcome="SOURCE_VERIFIED") && (evidence.reason="SOURCE_BOUND_H000_VERIFIED") {
            Set result=##class(DICOM3DAI.FHIR.H000AgentValidator).Validate(answer.Content,evidence,$Get(^||DICOM3DAIH000SelectionValidated))
        } Else { Set result.reason="SOURCE_OR_TOOL_NOT_VERIFIED" }
    } Catch ex { Set result.reason="AGENT_UNAVAILABLE" }
    Kill ^||DICOM3DAIH000SelectionValidated
    Set response.Payload=result.%ToJSON()
    Quit $$$OK
}
XData MessageMap
{
<MapItems><MapItem MessageType="DICOM3DAI.FHIR.FixtureRequest"><Method>Review</Method></MapItem></MapItems>
}
}
