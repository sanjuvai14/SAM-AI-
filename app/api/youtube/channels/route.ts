import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const connection = await getSocialConnection(userId, "youtube");
    if (!connection) return NextResponse.json({ connected: false, channels: [] });
    const metadata = connection.metadata || {};
    const channels = Array.isArray(metadata.channels) ? metadata.channels : [];
    return NextResponse.json({
      connected: true,
      selectedChannelId: connection.external_account_id,
      channels
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube channels unavailable." }, { status: 503 });
  }
}
