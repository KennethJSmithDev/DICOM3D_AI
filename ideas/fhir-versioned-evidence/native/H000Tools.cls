/// Controlled public-research fixture only. Not an authorization interface for patient data.
Class DICOM3DAI.FHIR.H000Tools Extends %AI.ToolSet
{
XData Definition [ MimeType = application/xml ]
{
<ToolSet Name="SourceBoundH000"><Tool Name="ReadEvidence" Method="ReadEvidence"/><Tool Name="SelectVerifiedStructure" Method="SelectVerifiedStructure"/></ToolSet>
}
ClassMethod ReadEvidence() As %DynamicObject
{
    Quit ##class(DICOM3DAI.FHIR.H000Evidence).Inspect("R5","5.0.0")
}
ClassMethod SelectVerifiedStructure(id As %String) As %DynamicObject
{
    Kill ^||DICOM3DAIH000SelectionValidated
    If id'="lesion.lung.mass.001" Quit {"status":"DENIED"}
    Set evidence=##class(DICOM3DAI.FHIR.H000Evidence).Inspect("R5","5.0.0")
    If (evidence.outcome'="SOURCE_VERIFIED") || (evidence.reason'="SOURCE_BOUND_H000_VERIFIED") Quit {"status":"UNVERIFIED"}
    Set ^||DICOM3DAIH000SelectionValidated=1
    Quit {"status":"SELECTED","semanticId":"lesion.lung.mass.001","evidenceReference":"ImagingSelection/r5p-h000-segment-1"}
}
}
