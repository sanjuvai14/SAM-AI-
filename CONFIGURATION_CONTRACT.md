# SAM configuration contract

Required for live AI:
- AI_PROVIDER=openai
- OPENAI_API_KEY=<owner-managed secret>
- OPENAI_MODEL=<optional; defaults in API route>

Deferred:
- SAM-owned Supabase project/database
- OAuth/social credentials
- commerce credentials
- Android signing/build credentials

Never commit secret values to GitHub.


## v4.13.1+ production gates
- `SAM_SUPABASE_URL` and `SAM_SUPABASE_ANON_KEY` are required before production persistence is enabled.
- `SAM_AUTH_PROVIDER` is required before protected authentication operations are enabled.
- Missing production configuration fails closed; there is no anonymous or fake-user fallback.
- These variables are placeholders for the dedicated SAM backend and must not point at another product's database.

- `SAM_SUPABASE_ACCESS_TOKEN` is the authenticated server-side access token used by the persistence adapter when a dedicated SAM database is connected; it must never be exposed to the browser or committed.
- Authenticated requests use a Supabase user access token in the Authorization header; the backend verifies the session before protected job operations.
