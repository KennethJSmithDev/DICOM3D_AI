/// Research-only comparison to caller-supplied source binding. Does not authorize selection.
Class DICOM3DAI.FHIR.H000Binding
{
ClassMethod One(items As %DynamicArray, name As %String, field As %String)
{
    Set n=0,result=""
    If '$IsObject(items) Quit result
    For i=0:1:items.%Size()-1 { Set item=items.%Get(i) If item.url=name { Set n=n+1,result=item.%Get(field) } }
    If n'=1 Quit ""
    Quit result
}
ClassMethod Parts(item As %DynamicObject, version As %String) As %DynamicObject
{
    Set out={"valid":0},invalid=0,ext="http://hl7.org/fhir/5.0/StructureDefinition/extension-ImagingSelection"
    If (version'="5.0.0") && (version'="4.0.1") && (version'="4.3.0") Quit out
    If version="5.0.0" { Set out.series=item.seriesUid,out.instances=item.instance }
    Else {
        If version="4.0.1" { Set list=item.extension.%Get(0).extension,prefix="" }
        Else { Set list=item.extension,prefix=ext_"." }
        Set out.series=..One(list,prefix_"seriesUid","valueId"),instances=[]
        If '$IsObject(list) { Set list=[] }
        For i=0:1:list.%Size()-1 {
            Set entry=list.%Get(i)
            If entry.url=(prefix_"instance") {
                Set children=entry.extension,instance={}
                If '$IsObject(children) { Set invalid=1 Quit }
                Set instance.uid=..One(children,"uid","valueId"),instance.sopClass=..One(children,"sopClass","valueCoding"),subset=[]
                For j=0:1:children.%Size()-1 { Set child=children.%Get(j) If child.url="subset" Do subset.%Push(child.valueString) }
                Do instance.%Set("subset",subset),instances.%Push(instance)
            }
        }
        Set out.instances=instances
    }
    If invalid || (out.series="") || '$IsObject(out.instances) || (out.instances.%Size()=0) Quit out
    Set out.valid=1 Quit out
}
ClassMethod Check(ct As %DynamicObject, seg As %DynamicObject, selection As %DynamicObject, context As %DynamicObject, binding As %DynamicObject, semanticId As %String, version As %String) As %DynamicObject
{
    Set result={"outcome":"REVIEW_REQUIRED","reason":"INSTANCE_BINDING_INVALID"}
    Try { Set result=..CheckInner(ct,seg,selection,context,binding,semanticId,version) } Catch ex { Set result.reason="INSTANCE_BINDING_INVALID" }
    Quit result
}
ClassMethod CheckInner(ct As %DynamicObject, seg As %DynamicObject, selection As %DynamicObject, context As %DynamicObject, binding As %DynamicObject, semanticId As %String, version As %String) As %DynamicObject
{
        Set result={"outcome":"REVIEW_REQUIRED","reason":"INSTANCE_BINDING_INVALID"}
        Set source=binding.source,structure=binding.structure,frames=binding.frames
        If (structure.%Get("semantic_id")'=semanticId) || (structure.source.%Get("segment_number")<1) || '$IsObject(frames) || (frames.%Size()=0) Quit result
        Set sel=##class(DICOM3DAI.FHIR.AuthFixtureImaging).Normalize(selection,version),ctx=##class(DICOM3DAI.FHIR.AuthFixtureImaging).Normalize(context,version)
        If 'sel.valid || 'ctx.valid Quit result
        If '$IsObject(selection.identifier) || (selection.identifier.%Size()'=1) Quit result
        Set semantic=selection.identifier.%Get(0)
        If (semantic.system'="urn:dicom3d:research:evidence") || (semantic.value'=semanticId) Quit result
        Set subject=ct.subject.reference
        If (subject="") || (seg.subject.reference'=subject) || (selection.subject.reference'=subject) || (context.subject.reference'=subject) Quit result
        If (ct.resourceType'="ImagingStudy") || (seg.resourceType'="ImagingStudy") || (sel.source'=("ImagingStudy/"_seg.id)) || (ctx.source'=("ImagingStudy/"_ct.id)) Quit result
        Set a=..Parts(selection,version),b=..Parts(context,version)
        If 'a.valid || 'b.valid Quit result
        If (sel.study'=source.%Get("source_study_uid")) || (ctx.study'=sel.study) || (sel.frame'=source.%Get("frame_of_reference_uid")) || (ctx.frame'=sel.frame) Quit result
        If (ct.identifier.%Get(0).value'=("urn:oid:"_sel.study)) || (seg.identifier.%Get(0).value'=("urn:oid:"_sel.study)) Quit result
        If '$IsObject(ct.series) || (ct.series.%Size()'=1) || '$IsObject(seg.series) || (seg.series.%Size()'=1) Quit result
        Set ctseries=ct.series.%Get(0),segseries=seg.series.%Get(0)
        If (ctseries.uid'=source.%Get("ct_series_uid")) || (b.series'=ctseries.uid) || (segseries.uid'=source.%Get("segmentation_series_uid")) || (a.series'=segseries.uid) Quit result
        Set result.reason="CT_INSTANCE_MISMATCH",ctinstances=ctseries.instance
        If '$IsObject(ctinstances) || (ctseries.numberOfInstances'=ctinstances.%Size()) || (ctinstances.%Size()'=frames.%Size()) Quit result
        Kill ctseen,frameseen,occupied,ctxseen
        Set checked=0
        For i=0:1:ctinstances.%Size()-1 {
            Set inst=ctinstances.%Get(i),id=inst.uid
            If (id="") || $Data(ctseen(id)) || (inst.sopClass.system'="urn:ietf:rfc:3986") || (inst.sopClass.code'="urn:oid:1.2.840.10008.5.1.4.1.1.2") Quit
            Set ctseen(id)=1,checked=checked+1
        }
        If checked'=ctinstances.%Size() Quit result
        Set occupiedCount=0,checked=0
        For i=0:1:frames.%Size()-1 {
            Set f=frames.%Get(i),id=f.%Get("ct_sop_uid")
            If (id="") || $Data(frameseen(id)) || '$Data(ctseen(id)) Quit
            Set frameseen(id)=1,checked=checked+1
            If f.%Get("nonzero_voxels")>0 Set occupied(id)=1,occupiedCount=occupiedCount+1
        }
        If checked'=frames.%Size() Quit result
        Set result.reason="CT_CONTEXT_INSTANCE_MISMATCH"
        If (occupiedCount=0) || (b.instances.%Size()'=occupiedCount) Quit result
        Set checked=0
        For i=0:1:b.instances.%Size()-1 {
            Set inst=b.instances.%Get(i),id=inst.uid
            If (id="") || '$Data(occupied(id)) || $Data(ctxseen(id)) || (inst.sopClass.system'="urn:ietf:rfc:3986") || (inst.sopClass.code'="urn:oid:1.2.840.10008.5.1.4.1.1.2") Quit
            If $IsObject(inst.subset),inst.subset.%Size() Quit
            Set ctxseen(id)=1,checked=checked+1
        }
        If checked'=b.instances.%Size() Quit result
        Set result.reason="SEG_INSTANCE_MISMATCH"
        If '$IsObject(segseries.instance) || (segseries.numberOfInstances'=1) || (segseries.instance.%Size()'=1) || (a.instances.%Size()'=1) Quit result
        Set s=segseries.instance.%Get(0),selected=a.instances.%Get(0)
        If (s.uid'=source.%Get("segmentation_sop_uid")) || (selected.uid'=s.uid) || (s.sopClass.system'="urn:ietf:rfc:3986") || (s.sopClass.code'="urn:oid:1.2.840.10008.5.1.4.1.1.66.4") || (selected.sopClass.system'="urn:ietf:rfc:3986") || (selected.sopClass.code'=s.sopClass.code) Quit result
        Set result.reason="SEG_SUBSET_MISMATCH"
        If '$IsObject(selected.subset) || (selected.subset.%Size()'=1) || (selected.subset.%Get(0)'=(structure.source.%Get("segment_number")_"")) Quit result
        Set result.reason="CONSISTENT_INSTANCE_BINDING_REVIEW_REQUIRED"
    Quit result
}
}
