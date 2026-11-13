import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from plan_runner import evaluate, read_plan


class ReviewGateTests(unittest.TestCase):
    def write_plan(self, directory, value):
        path = Path(directory) / "plan.json"
        data = json.dumps(value).encode()
        path.write_bytes(data)
        return path, hashlib.sha256(data).hexdigest()

    def test_review_hash_and_assertions(self):
        with tempfile.TemporaryDirectory() as directory:
            path, digest = self.write_plan(directory, {"cases": [{"id": "read", "assertion": "operation-present", "path": "/Observation/{id}", "method": "get"}]})
            plan = read_plan(path, digest)
            self.assertTrue(evaluate(plan, {"paths": {"/Observation/{id}": {"get": {}}}})[0]["pass"])
            self.assertFalse(evaluate(plan, {"paths": {}})[0]["pass"])
            with self.assertRaises(ValueError):
                read_plan(path, "0" * 64)

    def test_generated_commands_are_not_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            path, digest = self.write_plan(directory, {"cases": [{"id": "bad", "assertion": "operation-present", "path": "/Observation", "method": "get", "command": "untrusted"}]})
            with self.assertRaises(ValueError):
                read_plan(path, digest)

    def test_duplicate_identifiers_and_unknown_actions_are_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            case = {"id": "same", "assertion": "operation-present", "path": "/Observation", "method": "get"}
            path, digest = self.write_plan(directory, {"cases": [case, case]})
            with self.assertRaises(ValueError):
                read_plan(path, digest)
            case["assertion"] = "execute-code"
            path, digest = self.write_plan(directory, {"cases": [case]})
            with self.assertRaises(ValueError):
                read_plan(path, digest)

    def test_oversized_plan_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "oversized.json"
            path.write_bytes(b" " * (64 * 1024 + 1))
            with self.assertRaises(ValueError):
                read_plan(path, hashlib.sha256(path.read_bytes()).hexdigest())


if __name__ == "__main__":
    unittest.main()
