# SAM — Continuation Checkpoint

## Project identity
- Product: SAM — private personal AI assistant
- Repository: sanjuvai14/SAM-AI-
- Branch: main
- SAM Vercel target: sam-ai-2026
- SAM must remain completely separate from CreateSoul/CreatorFlow.

## Current release checkpoint
- Version: 4.12.1-job-approval-foundation
- Added voice-first control with Bengali/English/Hindi recognition, spoken responses, push-to-talk, continuous listening toggle, and visible transcript feedback.
- Consequential external actions remain approval-gated; unclear voice input is not treated as a verified action.
- Previous automation foundation remains intact.
- Added automation API that prepares jobs but does not falsely claim external execution.
- Added automation architecture and Android implementation plan.

## v4.11.1 voice-control additions
- Voice intent/verification contracts in `lib/voice.ts`.
- Low-confidence voice transcripts are rejected instead of guessed.
- Automation-like voice requests are explicitly identified as consequential and remain approval-gated.
- Voice UI now provides transcript and safety status feedback.

## Verified baseline
- Responsive private AI workspace
- Browser-local conversation persistence
- Server-side OpenAI chat endpoint
- Browser voice input when supported
- Bengali/English/Hindi voice-language selection
- Production build workflow
- Configuration/release documentation
- Automation preparation API with verification-first status

## Remaining work
1. Verify the latest production build.
2. Add SAM-owned persistent database with secure RLS.
3. Authentication and secure sessions.
4. Durable scheduler/job queue and audit trail.
5. Official YouTube OAuth/API and upload/metadata verification.
6. Official Meta OAuth/API for Facebook/Instagram publishing and verification.
7. Official TikTok OAuth/API and publishing verification.
8. Android app implementation and real-device testing.
9. SAM AI 2026 production deployment.
10. Full E2E security/release audit.

## Verification rule
Never mark build, deployment, live AI, OAuth, publishing, or APK PASS unless actually verified.

## Separation rule
Do not deploy, edit, configure, or merge SAM into CreateSoul/CreatorFlow resources. The only exposed Supabase project is currently creatorflow-ai and must not be used for SAM.

## Recovery rule
For every meaningful SAM version update, create a complete project artifact pinned to the exact release commit and record its SHA-256. Future work may use that artifact as the recovery baseline.


## v4.12.0 command-engine additions
- Added lib/command-engine.ts to convert accepted text/voice requests into typed command proposals.
- Supported proposals: YouTube upload, YouTube SEO, Facebook video, Instagram video, and TikTok video.
- Consequential actions are always marked approval-required.
- Ambiguous consequential requests are blocked rather than guessed.
- Added /api/command as a proposal-only API; it never executes an external action.
- No OAuth token, platform post/upload, or real-world action is claimed as completed.

## Current implementation boundary
- The command engine is a safe proposal layer, not yet a durable execution worker.
- Persistent jobs, authentication, OAuth, scheduler, external API execution, and post-action verification remain separate release gates.


## v4.12.1 job/approval additions
- Added a typed job-state store scaffold with explicit state transitions.
- Added `/api/jobs` for job creation/listing and `/api/jobs/[id]` for inspection plus explicit approve/reject decisions.
- Approval only moves a job to queued; it does not execute an external action.
- Rejection records a failed/rejected state in the current process.
- This is intentionally ephemeral until SAM has its own authenticated persistent database; no CreateSoul/CreatorFlow database is used.


## v4.13.0 persistent-db-contract
- Added `supabase/migrations/202609220001_sam_jobs_audit.sql` as the SAM-owned durable jobs/audit schema contract.
- Added RLS policies scoped to authenticated `auth.uid()`.
- Client-side audit writes and job state mutation are intentionally blocked.
- Added `SAM_DATABASE_CONTRACT.md` documenting the deployment boundary.
- Migration has NOT been executed against any Supabase project.
- CreateSoul/CreatorFlow Supabase remains untouched.
- Dedicated SAM Supabase provisioning remains a separate approval/cost gate.


## v4.13.1 auth-boundary
- Added a fail-closed authentication context boundary in `lib/auth-context.ts`.
- Added typed audit event/store contract in `lib/audit.ts`.
- Protected operations must not trust client-supplied user IDs.
- Real session verification remains gated on SAM-owned authentication being provisioned.
