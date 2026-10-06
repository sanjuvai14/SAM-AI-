import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/social-oauth";
import { saveSocialConnection } from "@/lib/social-connections";
import { metaExchangeCode, metaRequestedScopes, metaVerify } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/?social=meta_denied", url.origin));
    if (!state || !code) throw new Error("Missing Meta OAuth callback parameters.");
    const { userId } = verifyOAuthState(state, "meta");
    const tokens = await metaExchangeCode(request, code);
    const account = await metaVerify(tokens.access_token);
    const expiresAt = typeof tokens.expires_in === "number" ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
    await saveSocialConnection({
      user_id: userId, platform: "meta", external_account_id: account.id,
      account_name: account.name || "Meta account", access_token: tokens.access_token,
      refresh_token: null, expires_at: expiresAt, scopes: metaRequestedScopes(),
      metadata: { provider: "meta", account, connectedAt: new Date().toISOString() },
    });
    return NextResponse.redirect(new URL("/?social=meta_connected", url.origin));
  } catch (error) {
    const target = new URL("/", url.origin);
    target.searchParams.set("social", "meta_error");
    target.searchParams.set("message", (error instanceof Error ? error.message : "Meta OAuth failed.").slice(0, 180));
    return NextResponse.redirect(target);
  }
}
