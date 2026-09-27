import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const connection = await getSocialConnection(userId, "youtube");
    if (!connection) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      account: {
        id: connection.external_account_id,
        name: connection.account_name,
        expiresAt: connection.expires_at,
        scopes: connection.scopes,
        metadata: connection.metadata,
      },
    });
  } catch {
    return NextResponse.json({ error: "YouTube connection status is unavailable." }, { status: 503 });
  }
}
