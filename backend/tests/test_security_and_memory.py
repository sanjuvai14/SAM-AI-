import os
from pathlib import Path

import pytest
from cryptography.fernet import Fernet

from sam_backend import memory
from sam_backend.security import read_workspace_file, safe_workspace_path, run_safe_command, write_workspace_file


def test_workspace_path_rejects_traversal(tmp_path, monkeypatch):
    monkeypatch.setenv("SAM_WORKSPACE_DIR", str(tmp_path / "workspace"))
    with pytest.raises(ValueError):
        safe_workspace_path("../outside.txt")


def test_workspace_write_refuses_overwrite(tmp_path, monkeypatch):
    monkeypatch.setenv("SAM_WORKSPACE_DIR", str(tmp_path / "workspace"))
    write_workspace_file("note.txt", "hello")
    assert read_workspace_file("note.txt") == "hello"
    with pytest.raises(FileExistsError):
        write_workspace_file("note.txt", "replace")


def test_commands_require_confirmation():
    with pytest.raises(PermissionError):
        run_safe_command("pwd", False)
    with pytest.raises(ValueError):
        run_safe_command("arbitrary_shell", True)


def test_encrypted_memory_round_trip(tmp_path, monkeypatch):
    memory_file = tmp_path / "data" / "memory.enc.jsonl"
    monkeypatch.setenv("SAM_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("SAM_MEMORY_FERNET_KEY", Fernet.generate_key().decode())
    memory.add_memory("private test phrase", ["test"])
    raw = memory_file.read_text(encoding="utf-8")
    assert "private test phrase" not in raw
    assert memory.search_memory("private test phrase")[0]["text"] == "private test phrase"
