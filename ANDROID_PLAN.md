# SAM Android Plan — v4.11.0

Target: private Android app for SAM.

Architecture:
1. Android client for chat, voice, job status, approvals, and audit.
2. SAM backend for AI, OAuth, job execution, verification, and secure storage.
3. Official YouTube/Meta/TikTok APIs for publishing instead of fragile UI automation.

Initial Android permissions should be minimal. Microphone is needed for voice input; notifications may be added for job completion. Broad device-control permissions are not part of the first release.

Build gates:
- Backend automation contract verified.
- OAuth integrations implemented and tested.
- Android release build succeeds.
- Real-device voice and job-status tests pass.
- Publishing is never reported successful without platform-side verification.
