# SAM Android plan — v4.27.0

## Architecture
1. Android client: chat, voice, job status, approvals and audit display.
2. SAM backend: AI, OAuth, job execution, verification and secure storage.
3. Official platform APIs: YouTube/Meta/TikTok rather than UI automation.

## Permissions
Microphone is required for voice input. Camera/screen capture remain permission-gated and must be tested on a real device. SAM does not request broad device-control permissions as a substitute for explicit user consent.

## Acceptance gates
- Production backend build succeeds.
- Provider OAuth integrations are authorized and tested.
- Android release build succeeds.
- Real-device voice, camera/screen permissions and job-status tests pass.
- External publishing is never reported successful without platform-side verification.
