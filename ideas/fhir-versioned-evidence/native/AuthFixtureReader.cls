Include %occStatus
/// Controlled synthetic fixture. Basic authenticates the client, not the server.
Class DICOM3DAI.FHIR.AuthFixtureReader
{
/// Explicit local research fixture mount; no default remote source or credentials.
Parameter FIXTUREROOT = "/run/dicom3d-ai-research";
ClassMethod ReadJSON(path As %String) As %DynamicObject
{
    Set pins=##class(%Stream.FileCharacter).%New(),sc=pins.LinkToFile(..#FIXTUREROOT_"/http-pins.json")
    If $$$ISERR(sc) || (pins.Size>65536) Throw ##class(%Exception.General).%New("Synthetic pins unavailable")
    Set expected={}.%FromJSON(pins.Read(65536))
    If 'expected.%IsDefined(path) Throw ##class(%Exception.General).%New("Synthetic resource outside scope")
    Set file=##class(%Stream.FileCharacter).%New(),sc=file.LinkToFile(..#FIXTUREROOT_"/private/reader.json")
    If $$$ISERR(sc) || (file.Size>4096) Throw ##class(%Exception.General).%New("Synthetic credentials unavailable")
    Set credentials={}.%FromJSON(file.Read(4096))
    Set http=##class(%Net.HttpRequest).%New()
    Set http.Server="127.0.0.1",http.Port=18136,http.Timeout=5,http.FollowRedirect=0,http.ProxyServer="",http.Username=credentials.username,http.Password=credentials.password
    Do http.SetHeader("Accept","application/fhir+json"),http.SetHeader("Cache-Control","no-cache")
    Set sc=http.Get(path)
    If $$$ISERR(sc) || '$IsObject(http.HttpResponse) || (http.HttpResponse.StatusCode'=200) || '$IsObject(http.HttpResponse.Data) || (http.HttpResponse.Data.Size>65536) {
        Throw ##class(%Exception.General).%New("Synthetic fixture read refused")
    }
    Set body=http.HttpResponse.Data.Read(65536)
    Set actual=$SYSTEM.Encryption.Base64Encode($SYSTEM.Encryption.SHAHash(256,$ZConvert(body,"O","UTF8")),1)
    If actual'=expected.%Get(path) Throw ##class(%Exception.General).%New("Synthetic content identity mismatch")
    Return {}.%FromJSON(body)
}
}
