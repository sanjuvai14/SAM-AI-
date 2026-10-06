import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { createOAuthState } from "@/lib/social-oauth";
import { tiktokAuthorizationUrl } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    return NextResponse.redirect(tiktokAuthorizationUrl(request, createOAuthState("tiktok", userId)));
  } catch {
    return NextResponse.json({ error: "TikTok connection could not be started. Check SAM authentication and TikTok OAuth configuration." }, { status: 503 });
  }
}
