# SAM Automation Architecture — v4.11.0

SAM automation is approval-gated and verification-first.

## Supported action contracts
- YouTube upload
- YouTube SEO metadata update
- Facebook video publishing
- Instagram video publishing
- TikTok video publishing

## Execution rule
The current route prepares a job only. It does not claim to publish anything. Real execution requires the owner's OAuth connection, official platform API, secure token storage, and a post-action verification read.

## Job lifecycle
queued -> awaiting_approval -> running -> succeeded/failed

Every external action must record an audit event containing action, timestamp, target platform, result, and verification state.

## Security boundary
- No access tokens in client code or Git.
- No uncontrolled phone-wide actions.
- Android must request only the permissions it needs.
- Consequential publishing remains explicitly approval-gated until the owner enables trusted automation.

## Android phase
The Android client will be a SAM control surface for the same backend job system, not a second automation implementation. This keeps OAuth, audit, verification, and secrets on the backend.
