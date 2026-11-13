/// Only reviewed, finite synthetic scenarios are executed; no generated code is evaluated.
Class DICOM3DAI.Metadata.GeneratedTests Extends %RegisteredObject
{
ClassMethod Run(pFile As %String)
{
	set file=##class(%Stream.FileCharacter).%New(), sc=file.LinkToFile(pFile)
	if '$system.Status.IsOK(sc) { do $system.OBJ.DisplayError(sc) do $system.Process.Terminate(,1) }
	set plan=##class(%DynamicObject).%FromJSON(file), cases=plan.%Get("cases")
	if '$isobject(cases) || (cases.%Size()<1) || (cases.%Size()>10) { write "INVALID PLAN",! do $system.Process.Terminate(,1) }
	set sc=##class(Ens.Director).StartProduction("DICOM3DAI.Metadata.Production")
	if '$system.Status.IsOK(sc) { do $system.OBJ.DisplayError(sc) do $system.Process.Terminate(,1) }
	set sc=##class(Ens.Director).CreateBusinessService("MetadataEntry", .entry)
	if '$system.Status.IsOK(sc) { do $system.OBJ.DisplayError(sc) do $system.Process.Terminate(,1) }
	set results=[], iter=cases.%GetIterator()
	while iter.%GetNext(, .test) {
		set req=##class(DICOM3DAI.Metadata.Request).%New()
		set req.RequestId="synthetic-request",req.CaseId="synthetic-case",req.EvidenceReference="Observation/synthetic",req.SourceStudyId="study-a",req.EvidenceStudyId="study-a"
		set scenario=test.%Get("scenario"), expected=test.%Get("expected")
		if scenario="missing-case" set req.CaseId=""
		if scenario="mismatch" set req.EvidenceStudyId="study-b"
		if (scenario'="valid") && (scenario'="missing-case") && (scenario'="mismatch") { write "INVALID SCENARIO",! do $system.Process.Terminate(,1) }
		set sc=entry.ProcessInput(req,.resp)
		set actual=$select($system.Status.IsOK(sc)&&$isobject(resp):resp.Outcome,1:"ERROR")
		do results.%Push({"scenario":(scenario),"expected":(expected),"actual":(actual),"pass":(actual=expected)})
	}
	set sc=##class(Ens.Director).StopProduction()
	if '$system.Status.IsOK(sc) { do $system.OBJ.DisplayError(sc) do $system.Process.Terminate(,1) }
	write "AI_TEST_RESULTS=",results.%ToJSON(),!
}
}
