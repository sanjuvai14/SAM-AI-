# SAM Database Contract

This release adds the schema contract for a **SAM-owned** persistent backend.

## Safety boundary
- This migration must never be applied to CreateSoul/CreatorFlow.
- No existing Supabase project is used by this contract.
- The migration is intentionally not executed until a dedicated SAM database is provisioned and explicitly approved.

## Tables
- `sam_jobs`: durable approval/job lifecycle, scoped by authenticated `user_id`.
- `sam_audit_events`: append-oriented audit records for important actions and verification.

## RLS
- Users can read only their own jobs and audit events.
- Users can insert only their own jobs.
- Job state changes and audit writes are backend-controlled; there are no client write policies for those operations.

## Next integration gate
Authentication/session context must be established before replacing the current in-memory job store. The backend must fail closed when `auth.uid()` is unavailable.
