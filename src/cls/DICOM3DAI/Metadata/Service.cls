Class DICOM3DAI.Metadata.Service Extends Ens.BusinessService
{
Method OnProcessInput(pInput As %RegisteredObject, Output pOutput As %RegisteredObject) As %Status
{
	quit ..SendRequestSync("MetadataEcho", pInput, .pOutput, 20)
}
}
