Class DICOM3DAI.FHIR.FixtureService Extends Ens.BusinessService
{
Method OnProcessInput(pInput As %RegisteredObject, Output pOutput As %RegisteredObject) As %Status
{
    Quit ..SendRequestSync("VersionedFixtureInspect",pInput,.pOutput,15)
}
}
