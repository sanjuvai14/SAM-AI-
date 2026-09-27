import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection, saveSocialConnection } from "@/lib/social-connections";
import { youtubeRefreshAccessToken, youtubeUpload } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const connection = await getSocialConnection(userId, "youtube");
    if (!connection) return NextResponse.json({ error: "YouTube is not connected." }, { status: 409 });

    let accessToken = connection.access_token;
    const expiry = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
    if (expiry && expiry < Date.now() + 60_000) {
      if (!connection.refresh_token) {
        return NextResponse.json({ error: "YouTube session expired. Reconnect the YouTube account." }, { status: 401 });
      }
      const refreshed = await youtubeRefreshAccessToken(connection.refresh_token);
      accessToken = refreshed.access_token;
      await saveSocialConnection({
        ...connection,
        access_token: accessToken,
        refresh_token: connection.refresh_token,
        expires_at: typeof refreshed.expires_in === "number"
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : connection.expires_at,
      });
    }

    const form = await request.formData();
    const video = form.get("video");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "");
    const privacy = String(form.get("privacyStatus") || "private");

    if (!(video instanceof Blob) || video.size === 0) {
      return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    }
    if (video.size > 4 * 1024 * 1024) return NextResponse.json({ error: "This server upload endpoint currently supports files up to 4 MB. Larger videos need a direct resumable upload client." }, { status: 413 });
    if (!title) return NextResponse.json({ error: "A YouTube title is required." }, { status: 400 });
    if (!["private", "public", "unlisted"].includes(privacy)) {
      return NextResponse.json({ error: "Invalid privacyStatus." }, { status: 400 });
    }

    const result = await youtubeUpload(
      accessToken,
      video,
      title.slice(0, 100),
      description.slice(0, 5000),
      privacy as "private" | "public" | "unlisted",
    );

    return NextResponse.json({
      ok: true,
      video: result,
      verification: result.verification,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "YouTube upload failed.",
      verification: { status: "failed" },
    }, { status: 502 });
  }
}
