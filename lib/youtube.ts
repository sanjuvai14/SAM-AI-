import { oauthRedirectUri, requireEnv } from "./social-oauth";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3/videos";

export function youtubeAuthorizationUrl(request: Request, state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("YOUTUBE_CLIENT_ID"),
    redirect_uri: oauthRedirectUri(request, "youtube"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "https://www.googleapis.com/auth/youtube.upload",
    state
  });
  return AUTH + "?" + params.toString();
}

export async function youtubeExchangeCode(request: Request, code: string) {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("YOUTUBE_CLIENT_ID"),
    client_secret: requireEnv("YOUTUBE_CLIENT_SECRET"),
    redirect_uri: oauthRedirectUri(request, "youtube"),
    grant_type: "authorization_code"
  });
  const response = await fetch(TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "YouTube OAuth token exchange failed.");
  return data;
}

async function youtubeGet(token: string, path: string) {
  const response = await fetch(API + path, { headers: { Authorization: "Bearer " + token } });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || "YouTube API request failed.");
  return data;
}

export async function youtubeVerify(token: string) {
  const data = await youtubeGet(token, "/channels?part=id,snippet&mine=true");
  return { verified: Array.isArray(data.items) && data.items.length > 0, channel: data.items?.[0] || null };
}

export async function youtubeUpload(token: string, video: Blob, title: string, description: string, privacyStatus: "private" | "public" | "unlisted" = "private") {
  const init = await fetch(UPLOAD + "?part=snippet,status&uploadType=resumable", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": video.type || "application/octet-stream",
      "x-upload-content-length": String(video.size)
    },
    body: JSON.stringify({ snippet: { title, description }, status: { privacyStatus } })
  });
  if (!init.ok) throw new Error((await init.text()) || "YouTube upload initialization failed.");
  const location = init.headers.get("location");
  if (!location) throw new Error("YouTube upload session URL missing.");
  const upload = await fetch(location, {
    method: "PUT",
    headers: { Authorization: "Bearer " + token, "content-type": video.type || "application/octet-stream", "content-length": String(video.size) },
    body: video
  });
  const result = await upload.json().catch(() => ({}));
  if (!upload.ok || !result.id) throw new Error(result.error?.message || "YouTube upload failed.");
  const verify = await youtubeGet(token, "/videos?part=id,status,snippet&id=" + encodeURIComponent(result.id));
  const item = verify.items?.[0];
  if (!item?.id) throw new Error("YouTube upload verification failed.");
  return { id: item.id, status: item.status, snippet: item.snippet, verification: { verified: true, checkedAt: new Date().toISOString() } };
}
