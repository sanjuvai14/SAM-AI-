# SAM — Private AI Assistant

SAM is a separate private AI assistant project.

## Current release state

- Responsive private AI workspace UI: **implemented**
- Conversation UI with local browser persistence: **implemented**
- Server-side OpenAI chat route: **implemented**
- Voice input via browser Web Speech API when supported: **implemented**
- Production build workflow: **configured**
- Supabase/database: **intentionally deferred**
- OAuth/social/commercial integrations: **intentionally deferred**
- Android APK: **separate build step later**

### AI configuration

The server accepts OPENAI_API_KEY (or AI_PROVIDER_API_KEY) and optional OPENAI_MODEL. No secrets are stored in the repository.

### Deployment rule

SAM must remain separate from CreateSoul/CreatorFlow. Do not deploy this repository to an unrelated Vercel project.

Only a successful real build/deployment/API test should be described as verified.
