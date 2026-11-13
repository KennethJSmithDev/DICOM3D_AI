Class DICOM3DAI.Metadata.Request Extends Ens.Request
{
Property RequestId As %String(MAXLEN = 80);
Property CaseId As %String(MAXLEN = 80);
Property EvidenceReference As %String(MAXLEN = 200);
Property SourceStudyId As %String(MAXLEN = 80);
Property EvidenceStudyId As %String(MAXLEN = 80);
}
