Include %occStatus
/// Synthetic local fixture probe only. It cannot authorize evidence or selection.
Class DICOM3DAI.FHIR.FixtureReader
{
ClassMethod ReadJSON(path As %String) As %DynamicObject
{
    Set http=##class(%Net.HttpRequest).%New()
    Set http.Server="127.0.0.1",http.Port=18135,http.Timeout=5,http.FollowRedirect=0,http.ProxyServer=""
    Do http.SetHeader("Accept","application/fhir+json"),http.SetHeader("Cache-Control","no-cache")
    Set sc=http.Get(path)
    If $$$ISERR(sc) || '$IsObject(http.HttpResponse) || (http.HttpResponse.StatusCode'=200) || '$IsObject(http.HttpResponse.Data) || (http.HttpResponse.Data.Size>65536) {
        Throw ##class(%Exception.General).%New("Synthetic fixture read refused")
    }
    Return {}.%FromJSON(http.HttpResponse.Data)
}
ClassMethod Inspect(pathVersion As %String, expectedVersion As %String) As %DynamicObject
{
    Set prefix=$Select(pathVersion="R4":"/r4",pathVersion="R4B":"/r4b",pathVersion="R5":"/r5",1:"")
    Set result={"outcome":"REVIEW_REQUIRED","reason":"SOURCE_REFUSED"}
    If (prefix="") || ('$ListFind($ListBuild("4.0.1","4.3.0","5.0.0"),expectedVersion)) Quit result
    Try {
        Set metadata=..ReadJSON(prefix_"/metadata")
        If (metadata.resourceType'="CapabilityStatement") || (metadata.fhirVersion'=expectedVersion) {
            Set result.reason="FHIR_VERSION_MISMATCH"
        } Else {
            Set observed=..ReadJSON(prefix_"/Observation/synthetic-001")
            If (observed.resourceType'="Observation") || (observed.id'="synthetic-001") || (observed.meta.versionId'="1") || (observed.status'="final") {
                Set result.reason="SOURCE_IDENTITY_MISMATCH"
            } Else {
                Set result.reason="SYNTHETIC_RESOURCE_INSPECTED",result.fhirVersion=metadata.fhirVersion,result.sourceReference="Observation/synthetic-001",result.resourceVersion=observed.meta.versionId
            }
        }
    } Catch ex { Set result.reason="SOURCE_READ_FAILED" }
    Quit result
}
}
