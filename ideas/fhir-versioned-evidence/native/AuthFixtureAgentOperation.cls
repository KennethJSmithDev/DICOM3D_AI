Include %occStatus
/// Research-only provider path; unavailable providers and absent tool calls fail closed.
Class DICOM3DAI.FHIR.AuthFixtureAgentOperation Extends Ens.BusinessOperation
{
Parameter INVOCATION="Queue";
Method Review(request As DICOM3DAI.FHIR.FixtureRequest, Output response As DICOM3DAI.FHIR.FixtureResponse) As %Status
{
    Set response=##class(DICOM3DAI.FHIR.FixtureResponse).%New(),result={"outcome":"REVIEW_REQUIRED","reason":"AGENT_UNAVAILABLE"}
    Kill ^||DICOM3DAIAuthFixtureToolCalled,^||DICOM3DAIAuthFixtureRoute
    Set version=$Select(request.PathVersion="R4":"4.0.1",request.PathVersion="R4B":"4.3.0",request.PathVersion="R5":"5.0.0",1:"")
    If (version="") || (version'=request.ExpectedVersion) { Set result.reason="SOURCE_REFUSED",response.Payload=result.%ToJSON() Quit $$$OK }
    Set ^||DICOM3DAIAuthFixtureRoute=request.PathVersion,kind=$Select(version="5.0.0":"ImagingSelection",1:"Basic")
    Try {
        Set provider=##class(%AI.Provider).Create("openai",{"api_key":"local-only","base_url":"http://127.0.0.1:53571/v1","http_config":{"request_timeout_secs":180}})
        Set agent=##class(%AI.Agent).%New(provider),agent.Model="gpt-oss:20b"
        Set agent.SystemPrompt="Call ReadEvidence. This synthetic evidence is review only. Return exactly JSON with disposition REVIEW_REQUIRED, semanticId synthetic.structure.001, citations [Observation/synthetic-001, "_kind_"/seg-sel], a brief explanation and a limitation. Do not diagnose or select a structure."
        Do agent.UseToolSet("DICOM3DAI.FHIR.AuthFixtureTools")
        Set session=agent.CreateSession({"max_iterations":3,"temperature":0,"max_tokens":1024}),answer=agent.Chat(session,"Inspect the configured synthetic FHIR evidence and explain the review boundary.")
        If $Get(^||DICOM3DAIAuthFixtureToolCalled)=1 {
            Set evidence=##class(DICOM3DAI.FHIR.AuthFixtureImaging).Inspect(request.PathVersion,version),result=##class(DICOM3DAI.FHIR.AuthFixtureValidator).Validate(answer.Content,evidence)
        } Else { Set result.reason="REQUIRED_TOOL_NOT_CALLED" }
    } Catch ex { Set result.reason="AGENT_UNAVAILABLE" }
    Kill ^||DICOM3DAIAuthFixtureToolCalled,^||DICOM3DAIAuthFixtureRoute
    Set response.Payload=result.%ToJSON()
    Quit $$$OK
}
XData MessageMap
{
<MapItems><MapItem MessageType="DICOM3DAI.FHIR.FixtureRequest"><Method>Review</Method></MapItem></MapItems>
}
}
