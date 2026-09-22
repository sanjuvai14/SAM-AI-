import { oauthRedirectUri, requireEnv } from "./social-oauth";

const API = "https://open.tiktokapis.com/v2";

export function tiktokAuthorizationUrl(request: Request, state: string) {
  const params = new URLSearchParams({
    client_key: requireEnv("TIKTOK_CLIENT_KEY"),
    response_type: "code",
    scope: "user.info.basic,video.publish,video.upload",
    redirect_uri: oauthRedirectUri(request, "tiktok"),
    state
  });
  return "https://www.tiktok.com/v2/auth/authorize/?" + params.toString();
}

export async function tiktokExchangeCode(request: Request, code: string) {
  const body = new URLSearchParams({
    client_key: requireEnv("TIKTOK_CLIENT_KEY"),
    client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: oauthRedirectUri(request, "tiktok")
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || data.error || "TikTok OAuth token exchange failed.");
  return data;
}

async function tiktokPost(token: string, path: string, body: unknown) {
  const response = await fetch(API + path, { method: "POST", headers: { Authorization: "Bearer " + token, "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error?.code !== "ok") throw new Error(data.error?.message || "TikTok API request failed.");
  return data;
}

export async function tiktokVerify(token: string) {
  const data = await tiktokPost(token, "/post/publish/creator_info/query/", {});
  return { verified: data.error?.code === "ok", creator: data.data || null };
}

export async function tiktokDirectPostFromUrl(token: string, videoUrl: string, title: string, privacyLevel: string, isAigc = false) {
  const creator = await tiktokVerify(token);
  const allowed = creator.creator?.privacy_level_options || [];
  if (!allowed.includes(privacyLevel)) throw new Error("Requested TikTok privacy level is not allowed.");
  const init = await tiktokPost(token, "/post/publish/video/init/", {
    post_info: { title, privacy_level: privacyLevel, is_aigc: isAigc },
    source_info: { source: "PULL_FROM_URL", video_url: videoUrl }
  });
  const publishId = init.data?.publish_id;
  if (!publishId) throw new Error("TikTok returned no publish_id.");
  for (let i = 0; i < 15; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = await tiktokPost(token, "/post/publish/status/fetch/", { publish_id: publishId });
    const state = status.data?.status;
    if (state === "PUBLISH_COMPLETE" || state === "SEND_TO_USER_INBOX") {
      return { publishId, status: state, verification: { verified: true, checkedAt: new Date().toISOString() } };
    }
    if (state === "FAILED" || state === "ERROR") throw new Error(status.data?.fail_reason || "TikTok publishing failed.");
  }
  throw new Error("TikTok publish verification timed out.");
}
