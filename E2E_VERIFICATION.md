# SAM end-to-end verification matrix

## Automated/static checks
- Next.js production build command is defined: npm run build.
- GitHub Actions build workflow uses Node 24 and npm install without lockfile cache dependency.
- OAuth state is signed and time-limited.
- OAuth callbacks verify provider identity before persisting a connection.
- Social uploads perform provider-side post-upload/status verification before reporting verified.
- Job transitions require expected state and ownership.
- Paper trading has no real-money execution path.
- Android requests microphone permission only and uses the system speech recognizer.

## Live checks
Live provider upload, dedicated Supabase provisioning, Vercel production build, and physical Android microphone testing require external account/device access. SAM therefore fails closed instead of reporting those checks as passed without evidence.

## Release
The source checkpoint is tracked in SAM_CHECKPOINT_4.25.0.md.