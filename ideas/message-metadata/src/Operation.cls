Include %occStatus
Class DICOM3DAI.Metadata.Operation Extends Ens.BusinessOperation
{
Parameter INVOCATION = "Queue";
XData MessageMap
{
<MapItems><MapItem MessageType="DICOM3DAI.Metadata.Request"><Method>OnRequest</Method></MapItem></MapItems>
}
Method OnRequest(pRequest As DICOM3DAI.Metadata.Request, Output pResponse As DICOM3DAI.Metadata.Response) As %Status
{
	set pResponse = ##class(DICOM3DAI.Metadata.Response).%New()
	set pResponse.RequestId = pRequest.RequestId, pResponse.CaseId = pRequest.CaseId, pResponse.EvidenceReference = pRequest.EvidenceReference
	if (pRequest.RequestId="") || (pRequest.CaseId="") || (pRequest.EvidenceReference="") || (pRequest.SourceStudyId="") || (pRequest.EvidenceStudyId="") {
		set pResponse.Outcome = "REJECTED_MISSING_IDENTITY"
		quit $$$OK
	}
	if pRequest.SourceStudyId '= pRequest.EvidenceStudyId {
		set pResponse.Outcome = "REVIEW_REQUESTED"
		quit $$$OK
	}
	set pResponse.Outcome = "synthetic-echo"
	quit $$$OK
}
}
