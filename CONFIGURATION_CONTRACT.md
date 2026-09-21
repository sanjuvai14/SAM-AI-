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
