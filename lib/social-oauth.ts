import { createHmac } from "node:crypto";

export type SocialPlatform = "youtube" | "meta" | "tiktok";

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + " is missing.");
  return value;
}

export function oauthBaseUrl(request: Request) {
  return process.env.SAM_PUBLIC_URL || new URL(request.url).origin;
}

export function oauthRedirectUri(request: Request, platform: SocialPlatform) {
  return new URL("/api/oauth/" + platform + "/callback", oauthBaseUrl(request)).toString();
}

export function createOAuthState(platform: SocialPlatform, userId: string) {
  const payload = Buffer.from(JSON.stringify({ platform, userId, exp: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", requireEnv("SAM_OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifyOAuthState(state: string, platform: SocialPlatform) {
  const parts = state.split(".");
  if (parts.length !== 2) throw new Error("Invalid OAuth state.");
  const payload = parts[0];
  const signature = parts[1];
  const expected = createHmac("sha256", requireEnv("SAM_OAUTH_STATE_SECRET")).update(payload).digest("base64url");
  if (signature !== expected) throw new Error("Invalid OAuth state signature.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { platform: SocialPlatform; userId: string; exp: number };
  if (data.platform !== platform || data.exp < Date.now()) throw new Error("Expired or mismatched OAuth state.");
  return data;
}
