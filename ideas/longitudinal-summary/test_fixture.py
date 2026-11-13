import copy
import json
import unittest
from pathlib import Path
from datetime import datetime

def validate(bundle):
    assert bundle['resourceType'] == 'Bundle' and bundle['type'] == 'collection'
    resources = [entry['resource'] for entry in bundle['entry']]
    index = {resource['resourceType'] + '/' + resource['id']: resource for resource in resources}
    assert len(index) == len(resources)
    obs = [resource for resource in resources if resource['resourceType'] == 'Observation']
    assert len(obs) == 2
    for item in obs:
        assert item['subject']['reference'] == 'Patient/fictional-person-001'
        assert item['derivedFrom'][0]['reference'] in index
        assert item['valueQuantity']['code'] == 'mm'
    assert datetime.fromisoformat(obs[0]['effectiveDateTime'].replace('Z', '+00:00')) < datetime.fromisoformat(obs[1]['effectiveDateTime'].replace('Z', '+00:00'))
    for target in index['Provenance/fictional-provenance']['target']:
        assert target['reference'] in index

class SyntheticFixtureTests(unittest.TestCase):
    def setUp(self):
        self.bundle = json.loads((Path(__file__).parent / 'fixtures/synthetic-r5-bundle.json').read_text(encoding='utf-8'))
    def test_valid_fixture(self):
        validate(self.bundle)
    def test_mixed_patient_rejected(self):
        broken = copy.deepcopy(self.bundle)
        broken['entry'][3]['resource']['subject']['reference'] = 'Patient/other'
        with self.assertRaises(AssertionError): validate(broken)
    def test_missing_study_rejected(self):
        broken = copy.deepcopy(self.bundle)
        broken['entry'][3]['resource']['derivedFrom'][0]['reference'] = 'ImagingStudy/missing'
        with self.assertRaises(AssertionError): validate(broken)
    def test_reversed_chronology_rejected(self):
        broken = copy.deepcopy(self.bundle)
        broken['entry'][3]['resource']['effectiveDateTime'] = '2026-01-15T12:00:00Z'
        with self.assertRaises(AssertionError): validate(broken)

if __name__ == '__main__': unittest.main()
