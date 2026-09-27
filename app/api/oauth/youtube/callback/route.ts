import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/social-oauth";
import { saveSocialConnection } from "@/lib/social-connections";
import { youtubeExchangeCode, youtubeVerify } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const providerError = url.searchParams.get("error");

  try {
    if (providerError) {
      return NextResponse.redirect(new URL("/?youtube=denied", url.origin));
    }
    if (!state || !code) throw new Error("Missing OAuth callback parameters.");

    const { userId } = verifyOAuthState(state, "youtube");
    const tokens = await youtubeExchangeCode(request, code);
    const verification = await youtubeVerify(tokens.access_token);
    if (!verification.verified || !verification.channel?.id) {
      throw new Error("No YouTube channel was returned for the authorized Google account.");
    }

    const expiresAt = typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await saveSocialConnection({
      user_id: userId,
      platform: "youtube",
      external_account_id: String(verification.channel.id),
      account_name: verification.channel.snippet?.title || null,
      access_token: tokens.access_token,
      refresh_token: typeof tokens.refresh_token === "string" ? tokens.refresh_token : null,
      expires_at: expiresAt,
      scopes: typeof tokens.scope === "string" ? tokens.scope.split(" ").filter(Boolean) : ["https://www.googleapis.com/auth/youtube.upload"],
      metadata: {
        channel: verification.channel,
        connectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.redirect(new URL("/?youtube=connected", url.origin));
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube OAuth callback failed.";
    const target = new URL("/", url.origin);
    target.searchParams.set("youtube", "error");
    target.searchParams.set("message", message.slice(0, 180));
    return NextResponse.redirect(target);
  }
}
