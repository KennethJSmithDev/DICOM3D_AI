"""Optional local provider format hint; IRIS still owns evidence and validation."""
import json

def apply_versioned_review_format(request):
    if not isinstance(request,dict) or 'response_format' in request:
        return False
    messages=request.get('messages')
    if not isinstance(messages,list) or not messages or not isinstance(messages[-1],dict) or messages[-1].get('role')!='tool':
        return False
    last=messages[-1]
    try:
        evidence=json.loads(last.get('content',''))
    except (TypeError,ValueError):
        return False
    if not isinstance(evidence,dict) or any(evidence.get(k)!=v for k,v in {
        'outcome':'REVIEW_REQUIRED','reason':'CONSISTENT_IDENTITIES_REVIEW_REQUIRED',
        'semanticId':'synthetic.structure.001'
    }.items()):
        return False
    if (evidence.get('fhirVersion'),evidence.get('evidenceReference')) not in {
        ('4.0.1','Basic/seg-sel'),('4.3.0','Basic/seg-sel'),('5.0.0','ImagingSelection/seg-sel')
    }:return False
    call_id=last.get('tool_call_id')
    if not isinstance(call_id,str) or not call_id:
        return False
    valid_call=False
    for message in messages[:-1]:
        if not isinstance(message,dict) or message.get('role')!='assistant':continue
        calls=message.get('tool_calls')
        if not isinstance(calls,list):continue
        if any(isinstance(call,dict) and call.get('id')==call_id and
               isinstance(call.get('function'),dict) and call['function'].get('name')=='ReadEvidence' for call in calls):
            valid_call=True
            break
    if not valid_call:
        return False
    schema={'type':'object','additionalProperties':False,'required':['disposition','semanticId','citations','explanation','limitation'],
        'properties':{'disposition':{'type':'string','enum':['REVIEW_REQUIRED']},
        'semanticId':{'type':'string','enum':['synthetic.structure.001']},
        'citations':{'type':'array','items':{'type':'string'},'minItems':2,'maxItems':2},
        'explanation':{'type':'string'},'limitation':{'type':'string'}}}
    request['response_format']={'type':'json_schema','json_schema':{'name':'SyntheticEvidenceReview','strict':True,'schema':schema}}
    return True
