# SAM 4.21.0 Checkpoint

## Release
- Version: 4.21.0-voice-command-review
- Branch: main
- Feature commit: bed2cf573bc68c86bf94b1c820c1d364729b771c
- Version commit: b453bdb7ca8bbda377f529adf5b2120a8d70337a

## Changes
- Consequential voice requests now call the command proposal API instead of being sent directly to the AI chat route.
- Workspace displays the proposed action, reason, approval requirement, and explicit `Execution: not performed` state.
- User can review the transcript in the message box or dismiss the proposal.
- No external upload/post/publish action was added.

## Build / deployment
- GitHub Actions has a production-build workflow using Node 24 and npm install --no-audit --no-fund.
- Production build is not yet verified because the configured Vercel status remains failed and the SAM Vercel project is not visible to the current deployment connector.
- Do not treat the current release as production-build PASS until an actual build run succeeds.

## Safety boundary
- External automation remains approval-gated.
- No credentials, OAuth tokens, or paid services were added.
- Trading remains analysis/paper-trading only.
