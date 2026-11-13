import hashlib
import json
import unittest
from review_metadata_plan import validate


def encoded(value):
    data = json.dumps(value).encode()
    return data, hashlib.sha256(data).hexdigest()


class PlanReviewTests(unittest.TestCase):
    def setUp(self):
        self.plan = {"cases": [{"scenario": "valid", "expected": "synthetic-echo"},
                               {"scenario": "missing-case", "expected": "REJECTED_MISSING_IDENTITY"},
                               {"scenario": "mismatch", "expected": "REVIEW_REQUESTED"}]}

    def test_valid_plan_and_wrong_hash(self):
        data, digest = encoded(self.plan)
        self.assertEqual(validate(data, digest), self.plan)
        with self.assertRaises(ValueError):
            validate(data, "0" * 64)

    def test_incomplete_duplicate_and_generated_code_are_rejected(self):
        for cases in (self.plan["cases"][:1], self.plan["cases"] + [self.plan["cases"][0]],
                      self.plan["cases"] + [{"scenario": "valid", "expected": "synthetic-echo", "command": "bad"}]):
            data, digest = encoded({"cases": cases})
            with self.assertRaises(ValueError):
                validate(data, digest)

    def test_invalid_scenario_type_is_rejected(self):
        self.plan["cases"][0]["scenario"] = []
        data, digest = encoded(self.plan)
        with self.assertRaises(ValueError):
            validate(data, digest)


if __name__ == "__main__":
    unittest.main()
