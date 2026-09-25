# SAM social integration — v4.27.0

SAM uses official provider APIs and approval-gated server execution.

## Current source state
- Provider credentials are never committed to Git.
- Supabase token fields now support application-level encrypted storage.
- OAuth configuration contract is defined in .env.example.
- The production worker is fail-closed and will not claim an external action succeeded without a provider adapter response.
- OAuth provider registration and account authorization remain owner-controlled.

## Providers
YouTube/Google: OAuth 2.0 + YouTube Data API. Requires a Google Cloud OAuth client, enabled YouTube Data API, exact production callback URI, and account authorization.

Facebook/Instagram/Meta: Meta OAuth + Graph API. Requires a Meta app, approved products/permissions as applicable, exact callback URI, and Page/Instagram authorization.

TikTok: TikTok Login Kit + Content Posting API. Requires a TikTok developer app, approved scopes/products, exact callback URI, and account authorization. TikTok may restrict unaudited clients.

Amazon: gated Selling Partner API integration. Seller authorization and required API permissions must exist before live operations.

## Verification rule
A job may become succeeded only after the provider returns success and SAM performs a provider-side verification read where supported.

## Remaining live gates
Provider credentials, account authorization, platform review/audit where required, and real end-to-end tests are not fabricated in source control.
