"""Verify the DICOM3D_AI IPM class mirror and manifest without IRIS."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "contest/build154/src"
EXPECTED = {
    "Native001.Tools", "Native005.Request", "Native005.Response",
    "Native005.Tools", "Native005.SyntheticTools", "Native005.Operation",
    "Native005.Service", "Native005.Production",
}

def main():
    module = ET.parse(ROOT / "module.xml").getroot().find("./Document/Module")
    assert module is not None and module.findtext("Name") == "dicom3d-ai"
    assert module.findtext("SourcesRoot") == "src"
    resources = {x.attrib["Name"] for x in module.findall("Resource")}
    assert resources == {x + ".CLS" for x in EXPECTED} | {"DICOM3DAI.IPM.Guard.CLS"}
    guard = module.find("Resource[@Name='DICOM3DAI.IPM.Guard.CLS']")
    assert guard is not None and guard.attrib.get("Preload") == "true"
    hooks = module.findall("Invoke")
    assert len(hooks) == 1 and hooks[0].attrib == {"Class": "DICOM3DAI.IPM.Guard", "Method": "Check", "Phase": "Reload", "When": "Before", "CheckStatus": "true"}
    copies = module.findall("FileCopy")
    assert len(copies) == 1 and copies[0].attrib == {"Name": "docs/IPM.md", "Target": "${ipmDir}installed-docs/IPM.md"}
    assert not any(module.findall(tag) for tag in ("CSPApplication", "WebApplication", "CPF"))
    found = set()
    for name in sorted(EXPECTED):
        source = SOURCE / (name + ".cls")
        copy = ROOT / "src/cls" / Path(*name.split(".")).with_suffix(".cls")
        a, b = source.read_bytes(), copy.read_bytes()
        assert a == b and ("Class " + name + " ").encode() in b, name
        found.add(name)
    assert found == EXPECTED
    assert (ROOT / "preload/cls/DICOM3DAI/IPM/Guard.cls").is_file()
    print(json.dumps({"status": "PASS", "classes": len(found), "mirror": "byte-identical", "automatic_infrastructure": False}))

if __name__ == "__main__":
    main()
