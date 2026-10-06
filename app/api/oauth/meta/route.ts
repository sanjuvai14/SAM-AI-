import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { createOAuthState } from "@/lib/social-oauth";
import { metaAuthorizationUrl } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    return NextResponse.redirect(metaAuthorizationUrl(request, createOAuthState("meta", userId)));
  } catch {
    return NextResponse.json({ error: "Meta connection could not be started. Check SAM authentication and Meta OAuth configuration." }, { status: 503 });
  }
}
