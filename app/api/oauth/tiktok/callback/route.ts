import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/social-oauth";
import { saveSocialConnection } from "@/lib/social-connections";
import { tiktokExchangeCode, tiktokRequestedScopes, tiktokVerify } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/?social=tiktok_denied", url.origin));
    if (!state || !code) throw new Error("Missing TikTok OAuth callback parameters.");
    const { userId } = verifyOAuthState(state, "tiktok");
    const tokens = await tiktokExchangeCode(request, code);
    const account = await tiktokVerify(tokens.access_token);
    const expiresAt = typeof tokens.expires_in === "number" ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
    await saveSocialConnection({
      user_id: userId, platform: "tiktok", external_account_id: account.open_id,
      account_name: account.display_name || "TikTok account", access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null, expires_at: expiresAt,
      scopes: typeof tokens.scope === "string" ? tokens.scope.split(",").filter(Boolean) : tiktokRequestedScopes(),
      metadata: { provider: "tiktok", account, connectedAt: new Date().toISOString() },
    });
    return NextResponse.redirect(new URL("/?social=tiktok_connected", url.origin));
  } catch (error) {
    const target = new URL("/", url.origin);
    target.searchParams.set("social", "tiktok_error");
    target.searchParams.set("message", (error instanceof Error ? error.message : "TikTok OAuth failed.").slice(0, 180));
    return NextResponse.redirect(target);
  }
}
