Include %occStatus
/// Fail closed when the target namespace already contains candidate class packages.
Class DICOM3DAI.IPM.Guard
{
ClassMethod Check() As %Status
{
 Set statement=##class(%SQL.Statement).%New()
 Set sc=statement.%Prepare("SELECT Name FROM %Dictionary.ClassDefinition WHERE Name LIKE ? OR Name LIKE ? OR Name LIKE ? OR Name LIKE ? OR Name LIKE ?")
 If $$$ISERR(sc) Quit sc
 Set rows=statement.%Execute("Native001.%","Native005.%","DICOM3DAI.FHIROpenAPI.%","DICOM3DAI.Metadata.%","DICOM3DAI.FHIR.%")
 If rows.%SQLCODE<0 Quit $$$ERROR($$$GeneralError,"Unable to verify existing class ownership")
 If rows.%Next() Quit $$$ERROR($$$GeneralError,"Existing DICOM3D_AI classes found; use a dedicated namespace")
 Quit $$$OK
}
}
