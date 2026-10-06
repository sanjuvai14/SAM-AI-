import { oauthRedirectUri, requireEnv } from "./social-oauth";

const GRAPH = "https://graph.facebook.com/v23.0";

function scopes() {
  return process.env.META_SCOPES || "public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";
}

export function metaAuthorizationUrl(request: Request, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || requireEnv("FACEBOOK_CLIENT_ID"),
    redirect_uri: oauthRedirectUri(request, "meta"),
    response_type: "code",
    scope: scopes(),
    state,
  });
  return "https://www.facebook.com/v23.0/dialog/oauth?" + params.toString();
}

export async function metaExchangeCode(request: Request, code: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || requireEnv("FACEBOOK_CLIENT_ID"),
    client_secret: process.env.META_APP_SECRET || requireEnv("FACEBOOK_CLIENT_SECRET"),
    redirect_uri: oauthRedirectUri(request, "meta"),
    code,
  });
  const response = await fetch(GRAPH + "/oauth/access_token?" + params.toString(), { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") throw new Error(data.error?.message || "Meta OAuth token exchange failed.");
  return data as { access_token: string; expires_in?: number };
}

export async function metaVerify(accessToken: string) {
  const accountResponse = await fetch(GRAPH + "/me?fields=id,name", {
    headers: { Authorization: "Bearer " + accessToken }, cache: "no-store"
  });
  const account = await accountResponse.json();
  if (!accountResponse.ok || !account.id) throw new Error(account.error?.message || "Meta account verification failed.");

  const pagesResponse = await fetch(
    GRAPH + "/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100",
    { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" }
  );
  const pagesData = await pagesResponse.json();
  if (!pagesResponse.ok) throw new Error(pagesData.error?.message || "Meta Pages lookup failed.");

  return {
    id: account.id as string,
    name: account.name as string | undefined,
    verified: true,
    pages: Array.isArray(pagesData.data) ? pagesData.data : [],
  };
}

export async function facebookPageVideo(pageToken: string, pageId: string, video: Blob, caption: string) {
  const body = new FormData();
  body.append("source", video, "sam-video.mp4");
  if (caption) body.append("description", caption);
  const response = await fetch(GRAPH + "/" + encodeURIComponent(pageId) + "/videos", {
    method: "POST",
    headers: { Authorization: "Bearer " + pageToken },
    body,
  });
  const data = await response.json();
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Facebook video upload failed.");
  return data;
}

export async function instagramReel(pageToken: string, instagramBusinessAccountId: string, videoUrl: string, caption: string) {
  const containerParams = new URLSearchParams({
    media_type: "REELS",
    video_url: videoUrl,
  });
  if (caption) containerParams.set("caption", caption);
  const createResponse = await fetch(
    GRAPH + "/" + encodeURIComponent(instagramBusinessAccountId) + "/media?" + containerParams.toString(),
    { method: "POST", headers: { Authorization: "Bearer " + pageToken } }
  );
  const container = await createResponse.json();
  if (!createResponse.ok || !container.id) throw new Error(container.error?.message || "Instagram Reel container creation failed.");

  let status = "IN_PROGRESS";
  for (let i = 0; i < 12 && status !== "FINISHED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const statusResponse = await fetch(
      GRAPH + "/" + encodeURIComponent(container.id) + "?fields=status_code",
      { headers: { Authorization: "Bearer " + pageToken }, cache: "no-store" }
    );
    const statusData = await statusResponse.json();
    if (!statusResponse.ok) throw new Error(statusData.error?.message || "Instagram Reel processing check failed.");
    status = String(statusData.status_code || "");
    if (status === "ERROR" || status === "EXPIRED") throw new Error("Instagram Reel processing failed.");
  }

  if (status !== "FINISHED") throw new Error("Instagram Reel is still processing. Try publishing again after processing completes.");
  const publishResponse = await fetch(
    GRAPH + "/" + encodeURIComponent(instagramBusinessAccountId) + "/media_publish",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + pageToken, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: container.id }),
    }
  );
  const published = await publishResponse.json();
  if (!publishResponse.ok || !published.id) throw new Error(published.error?.message || "Instagram Reel publish failed.");
  return published;
}

export function metaRequestedScopes() {
  return scopes().split(",").map((v) => v.trim()).filter(Boolean);
}
