import { oauthRedirectUri, requireEnv } from "./social-oauth";

const GRAPH = "https://graph.facebook.com/v23.0";

export function metaAuthorizationUrl(request: Request, state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("META_APP_ID"),
    redirect_uri: oauthRedirectUri(request, "meta"),
    response_type: "code",
    state,
    scope: "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish"
  });
  return "https://www.facebook.com/v23.0/dialog/oauth?" + params.toString();
}

export async function metaExchangeCode(request: Request, code: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("META_APP_ID"),
    client_secret: requireEnv("META_APP_SECRET"),
    redirect_uri: oauthRedirectUri(request, "meta"),
    code
  });
  const response = await fetch(GRAPH + "/oauth/access_token?" + params.toString());
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error?.message || "Meta OAuth token exchange failed.");
  return data;
}

async function graphGet(path: string, token: string) {
  const join = path.includes("?") ? "&" : "?";
  const response = await fetch(GRAPH + path + join + "access_token=" + encodeURIComponent(token));
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || "Meta Graph API request failed.");
  return data;
}

export async function metaVerify(token: string) {
  const data = await graphGet("/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}", token);
  return { verified: Array.isArray(data.data), pages: data.data || [] };
}

export async function facebookPageVideo(token: string, pageId: string, video: Blob, description: string) {
  const form = new FormData();
  form.append("source", video, "sam-video.mp4");
  form.append("description", description);
  form.append("access_token", token);
  const response = await fetch(GRAPH + "/" + encodeURIComponent(pageId) + "/videos", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok || data.error || !data.id) throw new Error(data.error?.message || "Facebook video upload failed.");
  const verify = await graphGet("/" + encodeURIComponent(pageId) + "/videos?fields=id,description,status&limit=25", token);
  const verified = (verify.data || []).some((item: { id?: string }) => item.id === data.id);
  if (!verified) throw new Error("Facebook upload verification failed.");
  return { id: data.id, verification: { verified: true, checkedAt: new Date().toISOString() } };
}

export async function instagramReel(token: string, igUserId: string, videoUrl: string, caption: string) {
  const create = new URLSearchParams({ media_type: "REELS", video_url: videoUrl, caption, access_token: token });
  const createdResponse = await fetch(GRAPH + "/" + encodeURIComponent(igUserId) + "/media", { method: "POST", body: create });
  const created = await createdResponse.json();
  if (!createdResponse.ok || created.error || !created.id) throw new Error(created.error?.message || "Instagram reel container creation failed.");
  let status = "IN_PROGRESS";
  for (let i = 0; i < 15 && status === "IN_PROGRESS"; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const check = await graphGet("/" + encodeURIComponent(created.id) + "?fields=status_code,status", token);
    status = check.status_code || check.status || "UNKNOWN";
  }
  if (status !== "FINISHED" && status !== "PUBLISHED") throw new Error("Instagram reel processing did not finish: " + status);
  const publish = new URLSearchParams({ creation_id: created.id, access_token: token });
  const publishedResponse = await fetch(GRAPH + "/" + encodeURIComponent(igUserId) + "/media_publish", { method: "POST", body: publish });
  const published = await publishedResponse.json();
  if (!publishedResponse.ok || published.error || !published.id) throw new Error(published.error?.message || "Instagram reel publish failed.");
  const verified = await graphGet("/" + encodeURIComponent(published.id) + "?fields=id,media_type,permalink", token);
  if (verified.id !== published.id) throw new Error("Instagram publish verification failed.");
  return { id: published.id, permalink: verified.permalink || null, verification: { verified: true, checkedAt: new Date().toISOString() } };
}
