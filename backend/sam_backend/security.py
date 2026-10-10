from __future__ import annotations

import hmac
import os
import subprocess
from pathlib import Path
from typing import Any

from fastapi import Header, HTTPException

# Deliberately limited to read-only diagnostic commands. No shell=True, no pipes,
# no arbitrary command strings, and no file deletion or privilege escalation.
SAFE_COMMANDS: dict[str, list[str]] = {
    "pwd": ["pwd"],
    "list_workspace": ["python", "-c", "import os; print('\\n'.join(sorted(os.listdir('.'))))"],
    "whoami": ["whoami"],
    "date": ["date"],
    "system_info": ["python", "--version"],
}

def require_local_token(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("SAM_LOCAL_API_TOKEN", "").strip()
    if len(expected) < 32:
        raise HTTPException(status_code=503, detail="Set a strong SAM_LOCAL_API_TOKEN (at least 32 characters) in the local backend environment.")
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Local SAM token is missing or invalid.")

def workspace_root() -> Path:
    root = Path(os.getenv("SAM_WORKSPACE_DIR", "./workspace")).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root

def safe_workspace_path(relative_path: str) -> Path:
    if not relative_path or "\x00" in relative_path:
        raise ValueError("A non-empty relative path is required.")
    candidate = (workspace_root() / relative_path).resolve()
    root = workspace_root()
    if candidate != root and root not in candidate.parents:
        raise ValueError("Path is outside SAM's configured workspace.")
    return candidate

def list_workspace() -> list[dict[str, Any]]:
    root = workspace_root()
    rows = []
    for item in sorted(root.iterdir(), key=lambda p: p.name.lower())[:500]:
        rows.append({"name": item.name, "kind": "directory" if item.is_dir() else "file"})
    return rows

def read_workspace_file(relative_path: str, max_bytes: int = 1_000_000) -> str:
    path = safe_workspace_path(relative_path)
    if not path.is_file():
        raise FileNotFoundError("File does not exist inside the SAM workspace.")
    if path.stat().st_size > max_bytes:
        raise ValueError("File exceeds the 1 MB read limit.")
    return path.read_text(encoding="utf-8")

def write_workspace_file(relative_path: str, content: str) -> dict[str, Any]:
    if len(content.encode("utf-8")) > 1_000_000:
        raise ValueError("File exceeds the 1 MB write limit.")
    path = safe_workspace_path(relative_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    # Existing files are not overwritten implicitly.
    if path.exists():
        raise FileExistsError("File already exists. Use a different name; overwrite is intentionally disabled.")
    path.write_text(content, encoding="utf-8")
    return {"path": str(path.relative_to(workspace_root())), "bytes_written": len(content.encode("utf-8"))}

def run_safe_command(command_id: str, confirmed: bool) -> dict[str, Any]:
    if not confirmed:
        raise PermissionError("Explicit confirmation is required before running even a read-only command.")
    argv = SAFE_COMMANDS.get(command_id)
    if argv is None:
        raise ValueError("Command is not on SAM's read-only allowlist.")
    result = subprocess.run(
        argv,
        cwd=str(workspace_root()),
        shell=False,
        capture_output=True,
        text=True,
        timeout=5,
        check=False,
        env={"PATH": os.environ.get("PATH", ""), "LANG": "C.UTF-8"},
    )
    return {"command_id": command_id, "returncode": result.returncode, "stdout": result.stdout[:12000], "stderr": result.stderr[:4000]}
