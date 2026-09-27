# SAM verification matrix

## Verified from connected project tools
- GitHub repository and SAM Vercel project are present.
- Production deployment for commit `e856e4dad7c2ea6c85091228c730289790d4814b` reached READY.
- GitHub reported successful Vercel status checks for that commit.
- SAM Supabase project has the SAM tables and RLS enabled.
- Supabase Security Advisor reported one warning: leaked-password protection disabled.
- AI and command endpoints now require an authenticated SAM session in source.
- GitHub Actions workflow includes explicit typecheck and production build steps.

## Implemented, but not live-account verified
- Supabase email/password login flow.
- OpenAI chat endpoint.
- Browser speech recognition.
- YouTube OAuth callback, channel verification, encrypted token persistence, status endpoint, and upload/verification endpoint.
- Command proposal generation (does not execute external actions).

## Owner/device-dependent checks still required
- Latest commits after the recorded READY deployment must finish their own Vercel build and reach READY.
- Sign in with the owner's SAM account and verify AI request in the production UI.
- Confirm required Vercel environment variables and secrets.
- Complete real Google/YouTube OAuth authorization and a private test upload.
- Confirm upload appears in the authorized YouTube channel.
- Enable Supabase leaked-password protection if available for the project plan.
- Test microphone/voice on the owner's physical Android device.
- If Android app is needed: configure signing credentials, build signed APK/AAB, install, and test.
- Connect Meta/Instagram/TikTok individually later only when the owner chooses to add them.

## Acceptance rule
A code path or deployment status alone does not prove an end-to-end user flow. Mark an external integration/device test complete only after it has actually been performed and verified.
