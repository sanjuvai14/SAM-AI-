import { oauthRedirectUri, requireEnv } from "./social-oauth";

const AUTHORIZE = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";

function scopes() { return process.env.TIKTOK_SCOPES || "user.info.basic,video.list,video.publish"; }

export function tiktokAuthorizationUrl(request: Request, state: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || requireEnv("TIKTOK_CLIENT_ID"), response_type: "code", scope: scopes(),
    redirect_uri: oauthRedirectUri(request, "tiktok"), state,
  });
  return AUTHORIZE + "?" + params.toString();
}

export async function tiktokExchangeCode(request: Request, code: string) {
  const body = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || requireEnv("TIKTOK_CLIENT_ID"), client_secret: requireEnv("TIKTOK_CLIENT_SECRET"),
    code, grant_type: "authorization_code", redirect_uri: oauthRedirectUri(request, "tiktok"),
  });
  const response = await fetch(TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") throw new Error(data.error?.message || "TikTok OAuth token exchange failed.");
  return data as { access_token: string; refresh_token?: string; expires_in?: number; open_id?: string; scope?: string };
}

export async function tiktokVerify(accessToken: string) {
  const response = await fetch(API + "/user/info/?fields=" + encodeURIComponent("open_id,display_name,avatar_url"), {
    headers: { Authorization: "Bearer " + accessToken }, cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.data?.user?.open_id) throw new Error(data.error?.message || "TikTok account verification failed.");
  return data.data.user as { open_id: string; display_name?: string; avatar_url?: string };
}

export function tiktokRequestedScopes() { return scopes().split(",").map((v) => v.trim()).filter(Boolean); }
