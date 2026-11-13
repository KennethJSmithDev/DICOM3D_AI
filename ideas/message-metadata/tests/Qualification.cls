Class DICOM3DAI.Metadata.Qualification Extends %RegisteredObject
{
ClassMethod Check(pCondition As %Boolean, pName As %String)
{
	if 'pCondition { write "FAIL: ", pName, ! do $system.Process.Terminate(, 1) }
	write "PASS: ", pName, !
}
ClassMethod Run()
{
	set sc = ##class(Ens.Director).StartProduction("DICOM3DAI.Metadata.Production")
	do ..Check($system.Status.IsOK(sc), "isolated synthetic production starts")
	set sc = ##class(Ens.Director).CreateBusinessService("MetadataEntry", .entry)
	do ..Check($system.Status.IsOK(sc), "synthetic service created")
	set req = ##class(DICOM3DAI.Metadata.Request).%New()
	set req.RequestId = "request-synthetic-001", req.CaseId = "case-synthetic-001", req.EvidenceReference = "Observation/synthetic-observation-001"
	set req.SourceStudyId = "study-synthetic-001", req.EvidenceStudyId = "study-synthetic-001"
	set sc = entry.ProcessInput(req, .response)
	do ..Check($system.Status.IsOK(sc) && $isobject(response), "request passes through interoperability operation")
	do ..Check((response.RequestId=req.RequestId) && (response.CaseId=req.CaseId) && (response.EvidenceReference=req.EvidenceReference) && (response.Outcome="synthetic-echo"), "response retains all synthetic identifiers")
	set statement = ##class(%SQL.Statement).%New()
	set sc = statement.%Prepare("SELECT ID, SessionId, MessageBodyId FROM Ens.MessageHeader WHERE MessageBodyClassName = ?")
	do ..Check($system.Status.IsOK(sc), "supported message header query prepared")
	set rows = statement.%Execute("DICOM3DAI.Metadata.Request"), found = 0
	while rows.%Next() {
		set saved = ##class(DICOM3DAI.Metadata.Request).%OpenId(rows.%Get("MessageBodyId"))
		if $isobject(saved) && (saved.RequestId=req.RequestId) && (saved.CaseId=req.CaseId) && (saved.EvidenceReference=req.EvidenceReference) && (rows.%Get("SessionId")'="") set found = 1
	}
	do ..Check(found, "persisted message and session round-trip")
	set missing = ##class(DICOM3DAI.Metadata.Request).%New()
	set missing.RequestId="missing-case", missing.EvidenceReference="Observation/synthetic", missing.SourceStudyId="study-a", missing.EvidenceStudyId="study-a"
	set sc=entry.ProcessInput(missing, .missingResponse)
	do ..Check($system.Status.IsOK(sc) && (missingResponse.Outcome="REJECTED_MISSING_IDENTITY"), "missing case identity rejected")
	set mismatch=##class(DICOM3DAI.Metadata.Request).%New()
	set mismatch.RequestId="mismatch-study", mismatch.CaseId="case-synthetic-001", mismatch.EvidenceReference="Observation/synthetic", mismatch.SourceStudyId="study-a", mismatch.EvidenceStudyId="study-b"
	set sc=entry.ProcessInput(mismatch, .mismatchResponse)
	do ..Check($system.Status.IsOK(sc) && (mismatchResponse.Outcome="REVIEW_REQUESTED"), "conflicting study identities require review")
	set sc = ##class(Ens.Director).StopProduction()
	do ..Check($system.Status.IsOK(sc), "owned synthetic production stops")
	write "METADATA QUALIFICATION PASSED", !
}
}
