/// This isolated synthetic tool is limited to the request's approved fixture.
Class DICOM3DAI.FHIR.AuthFixtureTools Extends %AI.ToolSet
{
XData Definition [ MimeType = application/xml ]
{
<ToolSet Name="SyntheticVersionedEvidence"><Tool Name="ReadEvidence" Method="ReadEvidence"/></ToolSet>
}
ClassMethod ReadEvidence() As %DynamicObject
{
    Set route=$Get(^||DICOM3DAIAuthFixtureRoute),version=$Select(route="R4":"4.0.1",route="R4B":"4.3.0",route="R5":"5.0.0",1:"")
    If version="" Quit {"outcome":"REVIEW_REQUIRED","reason":"SOURCE_REFUSED"}
    Set result=##class(DICOM3DAI.FHIR.AuthFixtureImaging).Inspect(route,version)
    Set ^||DICOM3DAIAuthFixtureToolCalled=1
    Quit result
}
}
