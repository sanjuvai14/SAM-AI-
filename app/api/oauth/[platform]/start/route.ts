import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { createOAuthState } from "@/lib/social-oauth";
import { metaAuthorizationUrl } from "@/lib/meta";
import { tiktokAuthorizationUrl } from "@/lib/tiktok";
import { youtubeAuthorizationUrl } from "@/lib/youtube";

export async function GET(request: NextRequest, context: { params: Promise<{ platform: string }> }) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const { platform } = await context.params;
    const state = createOAuthState(platform as "youtube" | "meta" | "tiktok", userId);
    let url: string;
    if (platform === "youtube") url = youtubeAuthorizationUrl(request, state);
    else if (platform === "meta") url = metaAuthorizationUrl(request, state);
    else if (platform === "tiktok") url = tiktokAuthorizationUrl(request, state);
    else return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OAuth start failed." }, { status: 401 });
  }
}
