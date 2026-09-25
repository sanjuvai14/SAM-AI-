# SAM end-to-end verification matrix — v4.27.0

## Verified now
- SAM Supabase tables have RLS enabled.
- Security Advisor currently reports only the Pro-plan leaked-password-protection warning.
- Queue schema has retry metadata.
- Queued jobs can be claimed atomically with row locking.
- Worker is fail-closed and records retry/failure state.
- Credential storage has encrypted fields available.
- No provider secret is committed to the repository.

## Not yet verified
- Live Google/YouTube authorization and upload.
- Live Meta/Facebook/Instagram authorization and publishing.
- Live TikTok authorization and posting.
- Amazon seller/API authorization and live operation.
- Production Vercel build after the latest commits.
- Real microphone speech recognition on a physical Android device.
- Real camera/screen permission acceptance on a physical device.
- Signed Android APK installation and acceptance testing.

## Acceptance rule
Unverified external-account or hardware tests are explicitly marked incomplete rather than being reported as passed.
