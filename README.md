# SAM — Private Personal Assistant

SAM is a private assistant project and remains separate from CreateSoul AI / CreatorFlow.

## Existing production application

The current hosted app remains the Next.js + React application on Vercel, with Supabase authentication, server-side OpenAI chat, browser speech input, a command-proposal safety model, and social integration foundations. The existing app is not replaced by the local companion added on this feature branch.

## New local-first companion (feature branch)

This branch adds a separate Python FastAPI backend and an Electron desktop shell for local computer access. See backend/README.md for setup and security boundaries.

Implemented in source:
- Authenticated localhost API and a minimal WebSocket health channel.
- Provider routing for local Ollama, OpenAI, and Anthropic.
- Encrypted append-only local memory using Fernet; the encryption key is supplied separately by the owner.
- CPU, RAM, disk, and uptime telemetry.
- Workspace-confined file listing, reading, and create-only writing with size limits.
- Read-only command allowlist with explicit confirmation; arbitrary shell execution is intentionally not implemented.
- Opt-in web search through a configured search provider.
- Optional faster-whisper transcription and Piper text-to-speech integrations.
- Electron desktop UI with context isolation, sandboxing, no Node integration in the renderer, and an allowlisted IPC API.
- Automated Python safety/memory tests and desktop JavaScript syntax checks.

## Important limitations

- These additions are on branch feat/sam-private-assistant-core; they have not been merged to main or deployed to the production Vercel app.
- The local backend must run on the user's own PC. Vercel's serverless environment is not a replacement for a persistent local desktop process.
- Local Ollama, Whisper, and Piper models/binaries must be installed and configured separately.
- The backend and Electron app have not yet been proven through a full installed runtime test or real PC/device end-to-end test.
- No signed desktop installer or signed Android release is claimed by this branch.
- Voice interruption/full-duplex audio, broad autonomous file operations, arbitrary terminal execution, ChromaDB/Qdrant vector retrieval, and production-grade encrypted credential vaulting are not claimed as complete.
- YouTube and other social OAuth/publishing still require real provider account consent and external verification. Meta/Instagram/TikTok are intentionally deferred.
- Never report external actions as complete unless the target provider verifies success.

## Security

- Do not commit API keys, OAuth secrets, access tokens, refresh tokens, signing keys, .env files, or local data.
- Keep the local API bound to 127.0.0.1. Do not expose port 8000 to the public internet.
- Configure a strong SAM_LOCAL_API_TOKEN (at least 32 characters) and a SAM_MEMORY_FERNET_KEY.
- Losing the Fernet key means encrypted memory cannot be recovered; store it securely and separately.
- Review and test this feature branch before merging or using it with sensitive data.

## Existing app verification

Before considering the production app release-ready, verify the current production environment variables, a real Supabase login, live AI chat, any desired YouTube account authorization/upload, and a signed Android release on a real device. Do not infer these tests passed from a successful Vercel build alone.
