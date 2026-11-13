Class DICOM3DAI.FHIR.H000AgentService Extends Ens.BusinessService
{
Method OnProcessInput(pInput As %RegisteredObject, Output pOutput As %RegisteredObject) As %Status
{
    Quit ..SendRequestSync("H000FixtureAgent",pInput,.pOutput,210)
}
}
