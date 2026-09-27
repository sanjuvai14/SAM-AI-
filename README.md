# SAM — Private Personal Assistant

SAM is Sanju's private assistant project and must remain separate from CreateSoul AI / CreatorFlow.

## Included in the current codebase

- Private workspace UI with browser-local conversation history.
- Supabase email/password authentication with HTTP-only session cookies.
- Server-side OpenAI chat endpoint.
- Browser speech input where supported (Bangla, English, Hindi UI options).
- Command classification and proposal-only behavior; external actions are not silently executed.
- YouTube OAuth start/callback foundation, channel verification, encrypted credential persistence, connection status, and authenticated video-upload endpoint.
- Supabase-backed job/audit/social-connection schema and security policies (review current migrations before applying to another project).
- Vercel production deployment and GitHub build workflow.

## Security expectations

- Do not commit API keys, OAuth secrets, access tokens, refresh tokens, or signing keys.
- AI and command POST endpoints require an authenticated SAM session.
- Social posting must remain explicit-approval gated and report success only after provider-side verification.
- Treat all external actions as unverified until the platform confirms them.
- SAM is for private personal use; social integrations may be connected incrementally later.

## Runtime configuration

See `.env.example`. Required production variables depend on which feature is enabled. OpenAI uses `OPENAI_API_KEY` and optional `OPENAI_MODEL`. SAM authentication requires `SAM_SUPABASE_URL` and `SAM_SUPABASE_ANON_KEY`. YouTube additionally requires Google OAuth client credentials, `SAM_OAUTH_STATE_SECRET`, `SAM_TOKEN_ENCRYPTION_KEY`, the SAM Supabase service token, and the production callback URL.

Never paste secrets into chat or commit them to GitHub.

## Build verification

```bash
npm install
npm run typecheck
npm run build
```

The GitHub Actions workflow runs typecheck and production build on pushes and pull requests to main.

## Remaining owner-only checks

- Confirm production environment variables are correct and current.
- Authorize the actual Google/YouTube account and test channel lookup/upload.
- Add Meta/Instagram/TikTok integrations later when desired.
- Install/test a signed Android release on a real device if the Android client is still wanted.
- Confirm Supabase Auth password-protection setting and perform a real account login/AI test.
