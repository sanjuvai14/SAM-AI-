import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/social-oauth";
import { saveSocialConnection } from "@/lib/social-connections";
import { youtubeExchangeCode, youtubeVerify } from "@/lib/youtube";
import { metaExchangeCode, metaVerify } from "@/lib/meta";
import { tiktokExchangeCode, tiktokVerify } from "@/lib/tiktok";

export async function GET(request: NextRequest, context: { params: Promise<{ platform: string }> }) {
  const { platform } = await context.params;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code || !state) return NextResponse.json({ error: "OAuth callback is missing code/state." }, { status: 400 });

  try {
    if (platform !== "youtube" && platform !== "meta" && platform !== "tiktok") {
      return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
    }
    const identity = verifyOAuthState(state, platform);
    if (platform === "youtube") {
      const tokens = await youtubeExchangeCode(request, code);
      const verification = await youtubeVerify(tokens.access_token);
      if (!verification.verified) throw new Error("YouTube channel verification failed.");
      await saveSocialConnection({
        user_id: identity.userId, platform: "youtube", external_account_id: verification.channel?.id || null,
        account_name: verification.channel?.snippet?.title || null, access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null, expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scopes: String(tokens.scope || "").split(" ").filter(Boolean), metadata: { channel: verification.channel || null }
      });
    } else if (platform === "meta") {
      const tokens = await metaExchangeCode(request, code);
      const verification = await metaVerify(tokens.access_token);
      if (!verification.verified) throw new Error("Meta account verification failed.");
      await saveSocialConnection({
        user_id: identity.userId, platform: "meta", external_account_id: null, account_name: "Meta connection",
        access_token: tokens.access_token, refresh_token: null, expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scopes: ["pages_manage_posts","pages_read_engagement","instagram_basic","instagram_content_publish"], metadata: { pages: verification.pages }
      });
    } else {
      const tokens = await tiktokExchangeCode(request, code);
      const verification = await tiktokVerify(tokens.access_token);
      if (!verification.verified) throw new Error("TikTok creator verification failed.");
      await saveSocialConnection({
        user_id: identity.userId, platform: "tiktok", external_account_id: tokens.open_id || null,
        account_name: verification.creator?.creator_nickname || null, access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null, expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        scopes: String(tokens.scope || "").split(",").filter(Boolean), metadata: { creator: verification.creator || null }
      });
    }
    return NextResponse.json({ connected: true, platform, verification: { verified: true, checkedAt: new Date().toISOString() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OAuth callback failed.", verification: { verified: false } }, { status: 400 });
  }
}
