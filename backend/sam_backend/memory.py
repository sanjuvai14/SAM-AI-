from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

def _cipher() -> Fernet:
    key = os.getenv("SAM_MEMORY_FERNET_KEY", "").strip()
    if not key:
        raise RuntimeError("Encrypted memory is disabled until SAM_MEMORY_FERNET_KEY is configured.")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeEncodeError) as exc:
        raise RuntimeError("SAM_MEMORY_FERNET_KEY is not a valid Fernet key.") from exc

def _path() -> Path:
    data = Path(os.getenv("SAM_DATA_DIR", "./data")).expanduser().resolve()
    data.mkdir(parents=True, exist_ok=True)
    return data / "memory.enc.jsonl"

def add_memory(text: str, tags: list[str] | None = None) -> dict[str, Any]:
    cleaned = text.strip()
    if not cleaned or len(cleaned) > 8000:
        raise ValueError("Memory must be between 1 and 8000 characters.")
    record = {"created_at": int(time.time()), "text": cleaned, "tags": [t[:40] for t in (tags or [])[:20]]}
    token = _cipher().encrypt(json.dumps(record, ensure_ascii=False).encode("utf-8"))
    with _path().open("ab") as handle:
        handle.write(token + b"\n")
    return {"created_at": record["created_at"], "tags": record["tags"], "encrypted": True}

def search_memory(query: str = "", limit: int = 20) -> list[dict[str, Any]]:
    cipher = _cipher()
    needle = query.casefold().strip()
    found: list[dict[str, Any]] = []
    path = _path()
    if not path.exists():
        return []
    for line in path.read_bytes().splitlines()[-5000:]:
        try:
            record = json.loads(cipher.decrypt(line).decode("utf-8"))
        except (InvalidToken, ValueError, json.JSONDecodeError):
            # Never expose or overwrite undecipherable records.
            continue
        if not needle or needle in record.get("text", "").casefold() or any(needle in tag.casefold() for tag in record.get("tags", [])):
            found.append(record)
    return found[-max(1, min(limit, 100)):]
