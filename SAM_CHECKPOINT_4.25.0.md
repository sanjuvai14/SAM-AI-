# SAM checkpoint 4.25.0

Implemented:
- YouTube OAuth authorization, code exchange, channel verification, resumable video upload, and post-upload verification.
- Meta OAuth authorization, code exchange, Page/Instagram account discovery, Facebook Page video upload verification, and Instagram Reels publish verification.
- TikTok OAuth authorization, code exchange, creator verification, Direct Post from public URL, and publish-status verification.
- HMAC-signed short-lived OAuth state.
- Dedicated social connection persistence contract and Supabase migration.
- Authenticated OAuth start and upload routes.
- Social integration environment contract.
- Version 4.25.0-social-oauth-verification.

Verification boundary:
- Repository code paths are implemented fail-closed.
- Real provider upload verification requires the owner's OAuth applications, approved scopes, authorized accounts, and dedicated SAM Supabase configuration.
- No provider secret is committed to GitHub.
