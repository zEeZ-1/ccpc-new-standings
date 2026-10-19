"""Build both browser variants from the same content scripts. Python 3, no dependencies."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent


def build():
    base = json.loads((ROOT / "qoj-ccpc/manifest.json").read_text(encoding="utf-8"))
    source_files = sorted({name for script in base["content_scripts"]
                           for key in ("js", "css") for name in script.get(key, [])})
    for target in ("chromium", "firefox"):
        manifest = dict(base)
        if target == "firefox":
            manifest.pop("minimum_chrome_version", None)
            manifest.update(json.loads((ROOT / "browsers/firefox.json").read_text(encoding="utf-8")))
        folder = ROOT / "output" / target / "qoj-ccpc"
        folder.mkdir(parents=True, exist_ok=True)
        contents = {name: (ROOT / "qoj-ccpc" / name).read_bytes() for name in source_files}
        contents["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        for name, data in contents.items():
            (folder / name).write_bytes(data)
        archive = ROOT / "output" / ("qoj-ccpc.zip" if target == "chromium" else "qoj-ccpc-firefox.zip")
        with ZipFile(archive, "w", ZIP_DEFLATED) as output:
            for name, data in sorted(contents.items()):
                output.writestr("qoj-ccpc/" + name, data)
            output.writestr("README.md", (ROOT / "README.md").read_bytes())
        print(f"Built {target}: {archive.relative_to(ROOT)} (v{manifest['version']})")


if __name__ == "__main__":
    build()
