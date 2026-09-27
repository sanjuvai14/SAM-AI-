import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { createOAuthState } from "@/lib/social-oauth";
import { youtubeAuthorizationUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const state = createOAuthState("youtube", userId);
    return NextResponse.redirect(youtubeAuthorizationUrl(request, state));
  } catch {
    return NextResponse.json(
      { error: "YouTube connection could not be started. SAM authentication or YouTube OAuth configuration is missing." },
      { status: 503 }
    );
  }
}
