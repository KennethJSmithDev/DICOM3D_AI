"""Verify the DICOM3D_AI IPM class mirror and manifest without IRIS."""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contest/build154/src"
EXPECTED = {
    "Native001.Tools", "Native005.Request", "Native005.Response",
    "Native005.Tools", "Native005.SyntheticTools", "Native005.Operation",
    "Native005.Service", "Native005.Production",
}
IDEA_GROUPS = {
    "DICOM3DAI.Metadata": ("ideas/message-metadata/src", {"Request", "Response", "Service", "Operation", "Production"}),
}
FHIR_CLASSES = {
    "FixtureRequest": "Request", "FixtureResponse": "Response",
    **{name: name for name in (
        "AuthFixtureReader", "AuthFixtureImaging", "H000Binding", "H000Evidence",
        "H000Tools", "H000AgentValidator", "H000AgentOperation", "H000AgentService", "H000Production",
    )},
}

def main():
    module = ET.parse(ROOT / "module.xml").getroot().find("./Document/Module")
    assert module is not None and module.findtext("Name") == "dicom3d-ai"
    assert module.findtext("Version") == "0.2.0"
    assert module.findtext("SourcesRoot") == "src"
    resources = {x.attrib["Name"] for x in module.findall("Resource")}
    idea_names = {prefix + "." + name for prefix, (_, names) in IDEA_GROUPS.items() for name in names}
    idea_names |= {"DICOM3DAI.FHIR." + name for name in FHIR_CLASSES}
    assert resources == {x + ".CLS" for x in EXPECTED | idea_names} | {"DICOM3DAI.IPM.Guard.CLS"}
    guard = module.find("Resource[@Name='DICOM3DAI.IPM.Guard.CLS']")
    assert guard is not None and guard.attrib.get("Preload") == "true"
    hooks = module.findall("Invoke")
    assert len(hooks) == 1 and hooks[0].attrib == {"Class": "DICOM3DAI.IPM.Guard", "Method": "Check", "Phase": "Reload", "When": "Before", "CheckStatus": "true"}
    copies = module.findall("FileCopy")
    assert {tuple(sorted(x.attrib.items())) for x in copies} == {
        tuple(sorted(x.items())) for x in (
            {"Name": "NOTICE", "Target": "${ipmDir}installed-docs/NOTICE"},
            {"Name": "docs/IPM.md", "Target": "${ipmDir}installed-docs/IPM.md"},
            {"Name": "docs/IDEAS.md", "Target": "${ipmDir}installed-docs/IDEAS.md"},
            {"Name": "docs/JUDGE-WALKTHROUGH.md", "Target": "${ipmDir}installed-docs/JUDGE-WALKTHROUGH.md"},
            {"Name": "ideas/fhir-openapi-r5/fhir-openapi.mjs", "Target": "${ipmDir}tools/fhir-openapi.mjs"},
            {"Name": "ideas/fhir-openapi-r5/export-openapi.mjs", "Target": "${ipmDir}tools/export-openapi.mjs"},
            {"Name": "ideas/ai-test-assist/plan_runner.py", "Target": "${ipmDir}tools/plan_runner.py"},
            {"Name": "ideas/ai-test-assist/propose_local.py", "Target": "${ipmDir}tools/propose_local.py"},
            {"Name": "ideas/ai-test-assist/review_metadata_plan.py", "Target": "${ipmDir}tools/review_metadata_plan.py"},
            {"Name": "ideas/ai-test-assist/synthetic-plan.json", "Target": "${ipmDir}tools/synthetic-plan.json"},
            {"Name": "ideas/ai-test-assist/README.md", "Target": "${ipmDir}tools/README.md"},
            *({"Name": f"ideas/fhir-versioned-evidence/{name}", "Target": f"${{ipmDir}}experimental/fhir/{name}"} for name in ("README.md", "reader.mjs", "selection-profile.mjs", "instance-binding.mjs", "evidence-review.mjs")),
            *({"Name": f"ideas/fhir-versioned-evidence/{name}", "Target": f"${{ipmDir}}experimental/fhir/{name}"} for name in ("h000-projection.mjs", "prepare-h000-fixture.mjs", "serve-h000-fixture.py")),
            {"Name": "contest/build154/fixtures/evidence.json", "Target": "${ipmDir}experimental/fhir/fixtures/evidence.json"},
            {"Name": "contest/build154/frontend/demo/h000/source-binding.json", "Target": "${ipmDir}experimental/fhir/fixtures/source-binding.json"},
            {"Name": "contest/build154/frontend/demo/h000/NOTICE.md", "Target": "${ipmDir}experimental/fhir/fixtures/NOTICE.md"},
        )
    }
    assert all((ROOT / x.attrib["Name"]).is_file() for x in copies)
    assert not any(module.findall(tag) for tag in ("CSPApplication", "WebApplication", "CPF"))
    found = set()
    for name in sorted(EXPECTED):
        source = SOURCE / (name + ".cls")
        copy = ROOT / "src/cls" / Path(*name.split(".")).with_suffix(".cls")
        a, b = source.read_bytes(), copy.read_bytes()
        assert a == b and ("Class " + name + " ").encode() in b, name
        found.add(name)
    assert found == EXPECTED
    for prefix, (source_dir, names) in IDEA_GROUPS.items():
        for name in sorted(names):
            full = prefix + "." + name
            source = ROOT / source_dir / (name + ".cls")
            copy = ROOT / "src/cls" / Path(*full.split(".")).with_suffix(".cls")
            data = copy.read_bytes()
            assert data == source.read_bytes() and ("Class " + full + " ").encode() in data, full
    for name, source_name in FHIR_CLASSES.items():
        full = "DICOM3DAI.FHIR." + name
        source = ROOT / "ideas/fhir-versioned-evidence/native" / (source_name + ".cls")
        copy = ROOT / "src/cls/DICOM3DAI/FHIR" / (name + ".cls")
        data = copy.read_bytes()
        assert data == source.read_bytes() and re.search(rb"\bClass\s+" + re.escape(full.encode()) + rb"(?:\s|\{)", data), full
    assert (ROOT / "preload/cls/DICOM3DAI/IPM/Guard.cls").is_file()
    print(json.dumps({"status": "PASS", "version": "0.2.0", "native_classes": len(found), "idea_classes": len(idea_names), "mirror": "byte-identical", "automatic_infrastructure": False}))

if __name__ == "__main__":
    main()
