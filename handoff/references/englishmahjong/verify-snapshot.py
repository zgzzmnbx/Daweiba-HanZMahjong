#!/usr/bin/env python3
"""Verify the unmodified, commit-pinned research snapshot. No network required."""
from pathlib import Path
import hashlib
import json


def main() -> None:
    root = Path(__file__).resolve().parent
    lock = json.loads((root / "upstream.lock.json").read_text(encoding="utf-8"))
    assert lock["commit"] == "6830301df3061cdd25350cf56807473e5505b311"
    entries = lock["files"] + lock["reference_images"]
    for item in entries:
        path = root / item["local_path"]
        data = path.read_bytes()
        assert len(data) == item["bytes"], f"Size mismatch: {path}"
        assert hashlib.sha256(data).hexdigest() == item["sha256"], f"SHA-256 mismatch: {path}"
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        assert hashlib.sha1(blob).hexdigest() == item["git_blob_sha1"], f"Git blob mismatch: {path}"
    assert (root / "LICENSE-EnglishMahjong.txt").read_bytes() == (root / "source-snapshot/LICENSE").read_bytes()
    assert "Copyright (c) 2020 Paweł Marczewski" in (root / "licenses/Autotable-COPYING.txt").read_text()
    assert not (root / "source-snapshot/.git").exists()
    print(f"PASS EnglishMahjong snapshot: {len(lock['files'])} original source files + {len(lock['reference_images'])} reference image; bytes, SHA-256 and Git blob hashes match.")
    print("Scope: source integrity only; no game implementation, build, rendering or multiplayer verification.")


if __name__ == "__main__":
    main()
