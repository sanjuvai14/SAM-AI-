import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection, updateSocialConnectionSelection } from "@/lib/social-connections";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const body = await request.json();
    const channelId = String(body.channelId || "");
    if (!channelId) return NextResponse.json({ error: "channelId is required." }, { status: 400 });

    const connection = await getSocialConnection(userId, "youtube");
    if (!connection) return NextResponse.json({ error: "YouTube is not connected." }, { status: 409 });

    const metadata = connection.metadata || {};
    const channels = Array.isArray(metadata.channels) ? metadata.channels : [];
    const channel = channels.find((item: any) => item?.id === channelId);
    if (!channel) return NextResponse.json({ error: "YouTube channel is not available for this connection." }, { status: 404 });

    const selected = {
      ...metadata,
      channel: { id: channel.id, snippet: { title: channel.title || null } },
      selectedChannelId: channel.id,
      selectedAt: new Date().toISOString()
    };

    await updateSocialConnectionSelection(
      userId,
      "youtube",
      channel.id,
      channel.title || null,
      selected
    );

    return NextResponse.json({ ok: true, selectedChannelId: channel.id, accountName: channel.title || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "YouTube channel selection failed." }, { status: 400 });
  }
}
