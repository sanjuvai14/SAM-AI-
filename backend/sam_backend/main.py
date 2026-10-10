from __future__ import annotations

import asyncio
import os
import secrets
import time
from pathlib import Path
from typing import Literal

import psutil
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.background import BackgroundTask
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .memory import add_memory, search_memory
from .providers import chat
from .research import web_search
from .security import list_workspace, read_workspace_file, require_local_token, run_safe_command, write_workspace_file

app = FastAPI(title="SAM Local Assistant API", version="0.1.0", docs_url="/docs")
origins = [o.strip() for o in os.getenv("SAM_ALLOWED_ORIGINS", "http://127.0.0.1:4317,http://localhost:4317").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)

class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=40)
    provider: Literal["ollama", "openai", "anthropic"] | None = None
    model: str | None = Field(default=None, max_length=120)

class MemoryRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    tags: list[str] = Field(default_factory=list, max_length=20)

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    limit: int = Field(default=5, ge=1, le=10)

class FileWriteRequest(BaseModel):
    path: str = Field(min_length=1, max_length=400)
    content: str = Field(max_length=1_000_000)

class CommandRequest(BaseModel):
    command_id: str = Field(min_length=1, max_length=80)
    confirmed: bool = False

@app.get("/health")
def health():
    return {"ok": True, "service": "sam-local-backend", "version": app.version}

@app.get("/api/system", dependencies=[Depends(require_local_token)])
def system_status():
    memory = psutil.virtual_memory()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": memory.percent,
        "memory_available_bytes": memory.available,
        "disk_percent": psutil.disk_usage(str(Path.home())).percent,
        "uptime_seconds": int(time.time() - psutil.boot_time()),
        "providers": {
            "ollama": bool(os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")),
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        },
    }

@app.post("/api/chat", dependencies=[Depends(require_local_token)])
async def chat_endpoint(body: ChatRequest):
    try:
        return await chat([m.model_dump() for m in body.messages], body.provider, body.model)
    except Exception as exc:
        # Keep credentials and upstream response bodies out of client errors.
        message = str(exc)
        if "not configured" in message or "Unknown provider" in message:
            raise HTTPException(status_code=400, detail=message) from exc
        raise HTTPException(status_code=502, detail="AI provider request failed. Check local provider status and configuration.") from exc

@app.get("/api/memory", dependencies=[Depends(require_local_token)])
def get_memory(q: str = "", limit: int = 20):
    try:
        return {"items": search_memory(q, limit)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@app.post("/api/memory", dependencies=[Depends(require_local_token)])
def post_memory(body: MemoryRequest):
    try:
        return add_memory(body.text, body.tags)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.get("/api/files", dependencies=[Depends(require_local_token)])
def files_list():
    return {"items": list_workspace()}

@app.get("/api/files/read", dependencies=[Depends(require_local_token)])
def file_read(path: str):
    try:
        return {"path": path, "content": read_workspace_file(path)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.post("/api/files/write", dependencies=[Depends(require_local_token)])
def file_write(body: FileWriteRequest):
    try:
        return write_workspace_file(body.path, body.content)
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.post("/api/commands/execute", dependencies=[Depends(require_local_token)])
def command_execute(body: CommandRequest):
    try:
        return run_safe_command(body.command_id, body.confirmed)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Read-only command failed.") from exc

@app.post("/api/research", dependencies=[Depends(require_local_token)])
async def research(body: SearchRequest):
    try:
        return await web_search(body.query, body.limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Web research provider request failed.") from exc

@app.post("/api/voice/transcribe", dependencies=[Depends(require_local_token)])
async def transcribe_audio(file: UploadFile = File(...)):
    if file.content_type not in {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Unsupported audio content type.")
    raw = await file.read(20 * 1024 * 1024 + 1)
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file is limited to 20 MB.")
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Local transcription is optional. Install faster-whisper in the backend environment first.") from exc
    import tempfile
    try:
        with tempfile.NamedTemporaryFile(suffix=Path(file.filename or "voice.wav").suffix or ".wav") as temp:
            temp.write(raw)
            temp.flush()
            model = WhisperModel(os.getenv("WHISPER_MODEL", "base"), device="cpu", compute_type="int8")
            segments, info = model.transcribe(temp.name, vad_filter=True)
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": transcript, "language": info.language, "language_probability": info.language_probability, "provider": "faster-whisper-local"}
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not transcribe this audio. Check the file format and local Whisper model.") from exc

@app.post("/api/voice/speak", dependencies=[Depends(require_local_token)])
def speak_local(body: dict):
    text = body.get("text")
    if not isinstance(text, str) or not text.strip() or len(text) > 4000:
        raise HTTPException(status_code=400, detail="Text must be between 1 and 4000 characters.")
    binary = os.getenv("PIPER_BIN", "").strip()
    model = os.getenv("PIPER_MODEL", "").strip()
    if not binary or not model or not Path(binary).is_file() or not Path(model).is_file():
        raise HTTPException(status_code=503, detail="Local Piper TTS is disabled until PIPER_BIN and PIPER_MODEL point to installed files.")
    import subprocess
    import tempfile
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as output:
            output_path = output.name
        result = subprocess.run([binary, "--model", model, "--output_file", output_path], input=text, capture_output=True, text=True, timeout=20, shell=False)
        if result.returncode != 0 or not Path(output_path).is_file():
            raise RuntimeError("Piper failed")
        return FileResponse(
            output_path,
            media_type="audio/wav",
            filename="sam-response.wav",
            background=BackgroundTask(lambda: Path(output_path).unlink(missing_ok=True)),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Local Piper TTS failed.") from exc

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    expected = os.getenv("SAM_LOCAL_API_TOKEN", "").strip()
    supplied = websocket.query_params.get("token", "")
    if len(expected) < 32 or not supplied or not secrets.compare_digest(expected, supplied):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict) or data.get("type") != "ping":
                await websocket.send_json({"type": "error", "message": "Supported WebSocket message: {type: ping}"})
                continue
            await websocket.send_json({"type": "pong", "timestamp": int(time.time())})
    except WebSocketDisconnect:
        return
