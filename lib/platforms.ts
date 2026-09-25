export type Platform = "youtube" | "meta" | "tiktok" | "amazon";

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function oauthState(platform: Platform, state: string) {
  return Buffer.from(JSON.stringify({ platform, state, ts: Date.now() }), "utf8").toString("base64url");
}

export function decodeOAuthState(value: string) {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { platform: Platform; state: string; ts: number };
  if (!parsed.state || Date.now() - parsed.ts > 10 * 60 * 1000) throw new Error("OAuth state expired");
  return parsed;
}

export function buildOAuthUrl(platform: Platform, state: string) {
  const redirect = requireEnv(`SAM_${platform.toUpperCase()}_OAUTH_REDIRECT_URI`);
  if (platform === "youtube") {
    const params = new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      redirect_uri: redirect,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  if (platform === "tiktok") {
    const params = new URLSearchParams({
      client_key: requireEnv("TIKTOK_CLIENT_KEY"),
      redirect_uri: redirect,
      response_type: "code",
      scope: "user.info.basic,video.publish",
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  }
  if (platform === "meta") {
    const version = requireEnv("META_GRAPH_VERSION");
    const params = new URLSearchParams({
      client_id: requireEnv("META_APP_ID"),
      redirect_uri: redirect,
      response_type: "code",
      scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish",
      state,
    });
    return `https://www.facebook.com/${version}/dialog/oauth?${params}`;
  }
  throw new Error("Amazon authorization is configured separately through the Selling Partner authorization workflow.");
}
