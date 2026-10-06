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
  const response = await fetch(GRAPH + "/me?fields=id,name", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Meta account verification failed.");
  return data as { id: string; name?: string };
}

export function metaRequestedScopes() {
  return scopes().split(",").map((v) => v.trim()).filter(Boolean);
}
