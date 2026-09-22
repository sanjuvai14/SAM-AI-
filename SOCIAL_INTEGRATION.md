# SAM social OAuth + verification

SAM v4.25.0 adds server-side OAuth callbacks and official API adapters for YouTube, Facebook/Instagram through Meta, and TikTok.

## OAuth entry points
- GET /api/oauth/youtube/start
- GET /api/oauth/meta/start
- GET /api/oauth/tiktok/start

All require a verified SAM Supabase bearer session. OAuth state is HMAC-signed and expires after 10 minutes.

## Upload endpoint
POST /api/social/upload as multipart/form-data.

### YouTube
Fields: platform=youtube, video=file, title, description, privacyStatus.
The adapter uses YouTube resumable upload and then reads the uploaded video back for verification.

### Facebook
Fields: platform=meta, mode=facebook, video=file, caption.
The adapter resolves the connected Page token through Meta and verifies the uploaded video by reading the Page video list.

### Instagram Reels
Fields: platform=meta, mode=instagram, videoUrl=public URL, caption.
The adapter creates a REELS container, polls processing status, publishes it, and verifies the resulting media object.

### TikTok Direct Post
Fields: platform=tiktok, videoUrl=public URL, title, privacyLevel, isAigc.
The adapter queries creator information, initializes Direct Post, polls publish status, and reports verified completion.

## Required environment
SAM_PUBLIC_URL
SAM_OAUTH_STATE_SECRET
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
META_APP_ID
META_APP_SECRET
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
SAM_SUPABASE_URL
SAM_SUPABASE_ANON_KEY
SAM_SUPABASE_ACCESS_TOKEN

The social-connection migration must be applied only to the dedicated SAM Supabase project.

## External approval boundary
OAuth client registration, redirect URI registration, API scopes, platform review/audit, and real account authorization remain controlled by the account owner. The code never invents or stores provider credentials in the repository.
