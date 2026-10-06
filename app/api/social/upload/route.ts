import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";
import { youtubeUpload } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const form = await request.formData();
    const platform = String(form.get("platform") || "");
    const connection = await getSocialConnection(userId, platform as "youtube" | "meta" | "tiktok");
    if (!connection) return NextResponse.json({ error: "Social account is not connected." }, { status: 409 });

    if (platform === "youtube") {
      const video = form.get("video");
      if (!(video instanceof Blob)) return NextResponse.json({ error: "YouTube upload requires a video file." }, { status: 400 });
      const result = await youtubeUpload(
        connection.access_token,
        video,
        String(form.get("title") || "SAM upload"),
        String(form.get("description") || ""),
        String(form.get("privacyStatus") || "private") as "private" | "public" | "unlisted"
      );
      return NextResponse.json({ platform, result });
    }

    return NextResponse.json({
      error: "Meta and TikTok publishing is not exposed by this upload endpoint yet. Use the Apps & social connections center for account authorization.",
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social upload failed." }, { status: 400 });
  }
}
