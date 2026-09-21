# SAM — Private AI Assistant

SAM is a dedicated private AI assistant workspace.

## Current baseline
- Core chat workspace: implemented.
- Server-side OpenAI route: implemented; credentials stay server-side.
- Responsive mobile/web UI: implemented.
- Scheduler, database persistence, OAuth integrations, native Android build and production deployment remain separate verification/integration steps.
- Never commit credentials.

## Deployment rule
SAM must use a SAM-specific Vercel project. Do not deploy SAM to unrelated CreateSoul/CreatorFlow projects.
