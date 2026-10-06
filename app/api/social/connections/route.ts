import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";

export const dynamic = "force-dynamic";

const platforms = ["youtube", "meta", "tiktok"] as const;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const entries = await Promise.all(platforms.map(async (platform) => {
      const connection = await getSocialConnection(userId, platform);
      return [platform, connection ? {
        connected: true,
        account: {
          id: connection.external_account_id,
          name: connection.account_name,
          expiresAt: connection.expires_at,
          scopes: connection.scopes,
          metadata: connection.metadata,
        },
      } : { connected: false }];
    }));
    return NextResponse.json(Object.fromEntries(entries));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social connections unavailable." }, { status: 503 });
  }
}
