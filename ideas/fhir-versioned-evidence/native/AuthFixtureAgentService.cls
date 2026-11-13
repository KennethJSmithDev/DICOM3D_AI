Class DICOM3DAI.FHIR.AuthFixtureAgentService Extends Ens.BusinessService
{
Method OnProcessInput(pInput As %RegisteredObject, Output pOutput As %RegisteredObject) As %Status
{
    Quit ..SendRequestSync("VersionedFixtureAgent",pInput,.pOutput,210)
}
}
