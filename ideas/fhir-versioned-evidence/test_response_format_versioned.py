import copy,json,unittest
from response_format_versioned import apply_versioned_review_format

def request():
    evidence={'outcome':'REVIEW_REQUIRED','reason':'CONSISTENT_IDENTITIES_REVIEW_REQUIRED','fhirVersion':'4.3.0','semanticId':'synthetic.structure.001','evidenceReference':'Basic/seg-sel'}
    return {'model':'gpt-oss:20b','messages':[{'role':'assistant','tool_calls':[{'id':'call-1','function':{'name':'ReadEvidence'}}]},{'role':'tool','tool_call_id':'call-1','content':json.dumps(evidence)}]}

class Projection(unittest.TestCase):
    def test_exact_tool_result_adds_only_output_format(self):
        value=request();original=copy.deepcopy(value)
        self.assertTrue(apply_versioned_review_format(value))
        fmt=value.pop('response_format');self.assertEqual(value,original)
        self.assertEqual(fmt['json_schema']['schema']['properties']['disposition']['enum'],['REVIEW_REQUIRED'])
    def test_refuses_wrong_tool_or_call_identity(self):
        for field in ('call','name'):
            value=request()
            if field=='call':value['messages'][1]['tool_call_id']='other'
            else:value['messages'][0]['tool_calls'][0]['function']['name']='Other'
            self.assertFalse(apply_versioned_review_format(value));self.assertNotIn('response_format',value)
    def test_refuses_changed_evidence_and_existing_format(self):
        for field in ('semanticId','evidenceReference','outcome','reason','fhirVersion'):
            value=request();e=json.loads(value['messages'][1]['content']);e[field]='other';value['messages'][1]['content']=json.dumps(e)
            self.assertFalse(apply_versioned_review_format(value));self.assertNotIn('response_format',value)
        value=request();value['response_format']={'type':'existing'};self.assertFalse(apply_versioned_review_format(value));self.assertEqual(value['response_format'],{'type':'existing'})
    def test_version_reference_pairs_are_exact(self):
        for version,ref in [('4.0.1','Basic/seg-sel'),('4.3.0','Basic/seg-sel'),('5.0.0','ImagingSelection/seg-sel')]:
            value=request();e=json.loads(value['messages'][1]['content']);e['fhirVersion']=version;e['evidenceReference']=ref;value['messages'][1]['content']=json.dumps(e)
            self.assertTrue(apply_versioned_review_format(value))
        value=request();e=json.loads(value['messages'][1]['content']);e['fhirVersion']='5.0.0';value['messages'][1]['content']=json.dumps(e)
        self.assertFalse(apply_versioned_review_format(value))
    def test_refuses_invalid_shapes(self):
        for value in (None,{}, {'messages':[]},{'messages':[{'role':'tool','content':'bad'}]}):self.assertFalse(apply_versioned_review_format(value))

if __name__=='__main__':unittest.main()
