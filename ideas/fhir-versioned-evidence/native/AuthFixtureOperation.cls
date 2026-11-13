Include %occStatus
Class DICOM3DAI.FHIR.AuthFixtureOperation Extends Ens.BusinessOperation
{
Parameter INVOCATION="Queue";
Method Inspect(request As DICOM3DAI.FHIR.FixtureRequest, Output response As DICOM3DAI.FHIR.FixtureResponse) As %Status
{
    Set response=##class(DICOM3DAI.FHIR.FixtureResponse).%New()
    Set result=##class(DICOM3DAI.FHIR.AuthFixtureImaging).Inspect(request.PathVersion,request.ExpectedVersion)
    Set response.Payload=result.%ToJSON()
    Quit $$$OK
}
XData MessageMap
{
<MapItems><MapItem MessageType="DICOM3DAI.FHIR.FixtureRequest"><Method>Inspect</Method></MapItem></MapItems>
}
}
