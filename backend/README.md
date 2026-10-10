# SAM Local Backend

This is an opt-in local companion backend. It does not replace the existing Next.js/Vercel app and is not deployed to Vercel. It runs on the user's own computer and binds to localhost.

## Requirements
- Python 3.11+
- Ollama installed locally for offline/local model inference, or credentials for OpenAI/Anthropic
- A strong SAM_LOCAL_API_TOKEN and a SAM_MEMORY_FERNET_KEY

## Setup and start
From the repository root:

1. Create a virtual environment and install dependencies:
   python -m venv .venv
   Windows: .venv\\Scripts\\activate
   macOS/Linux: source .venv/bin/activate
   pip install -r backend/requirements.txt
2. Copy backend/.env.example to backend/.env. Fill in SAM_LOCAL_API_TOKEN and SAM_MEMORY_FERNET_KEY. The backend loads this file automatically; shell variables take precedence. Never commit backend/.env.
3. Generate a token with: python -c "import secrets; print(secrets.token_urlsafe(48))"
4. Generate the memory key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
5. Start the server from the repository root:
   python -m uvicorn sam_backend.main:app --app-dir backend --host 127.0.0.1 --port 8000

Configure SAM_DEFAULT_PROVIDER=ollama and SAM_DEFAULT_MODEL for local inference. Ollama must already be running. OpenAI and Anthropic require their respective keys. Web research is opt-in and requires TAVILY_API_KEY.

## Desktop shell
From desktop/, install npm dependencies and launch Electron with SAM_LOCAL_API_TOKEN available in the process environment. The local backend must already be running. Do not expose port 8000 to the public internet.

## Security design
- The server binds to loopback in the documented command; do not change to 0.0.0.0 without designing network authentication and TLS.
- Protected endpoints use a bearer token.
- Workspace operations are confined to SAM_WORKSPACE_DIR, enforce size limits, and do not overwrite existing files.
- Command execution is restricted to a small read-only allowlist and requires an explicit confirmation flag. Arbitrary shell execution is intentionally not implemented.
- Web research uses an opt-in search provider. External result content is untrusted.
- API keys belong in environment variables, never in source code or chat.
- The memory file is encrypted with Fernet. Back up the key separately: losing it means the encrypted memory cannot be recovered.
- Whisper and Piper are optional local dependencies and must be installed/configured separately.
- This is a starter implementation, not a security audit. Review and test before using sensitive files.

## API
- GET /health
- GET /api/system
- POST /api/chat
- GET/POST /api/memory
- GET /api/files, GET /api/files/read?path=..., POST /api/files/write
- POST /api/commands/execute
- POST /api/research
- POST /api/voice/transcribe (optional faster-whisper)
- POST /api/voice/speak (optional Piper; returns a temporary WAV response)
- WS /ws?token=... (authenticated ping/pong health channel)

## Known limitations
The local backend and desktop UI are not yet validated through a full installed runtime or real PC/device E2E test. Full-duplex voice interruption, vector retrieval (ChromaDB/Qdrant), signed installers/releases, broad autonomous file actions, and arbitrary shell execution are not claimed complete.
