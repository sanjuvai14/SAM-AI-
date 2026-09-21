# SAM — Private AI Assistant

Dedicated repository for SAM.

## Current baseline
SAM v4.10.46 — assistant workspace + server-side AI route.

## Included now
- Responsive private assistant workspace
- Bangla / English / Hindi response-language selection
- Local chat history in the browser
- Server-side OpenAI-compatible chat route
- Fail-closed behavior when the owner API key is not configured
- No credentials committed to the repository
- External database, OAuth, commerce and automation connectors remain optional follow-up work

## Run
`npm install`
`npm run build`
`npm start`

The production deployment target can remain the existing SAM app. A separate Vercel project can be created later if needed; SAM must remain separate from unrelated projects.
