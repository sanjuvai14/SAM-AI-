import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";
import { youtubeUpload } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const connection = await getSocialConnection(userId, "youtube");
    if (!connection) return NextResponse.json({ error: "YouTube is not connected." }, { status: 409 });

    const form = await request.formData();
    const video = form.get("video");
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "");
    const privacy = String(form.get("privacyStatus") || "private");

    if (!(video instanceof Blob) || video.size === 0) {
      return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "A YouTube title is required." }, { status: 400 });
    if (!["private", "public", "unlisted"].includes(privacy)) {
      return NextResponse.json({ error: "Invalid privacyStatus." }, { status: 400 });
    }

    const result = await youtubeUpload(
      connection.access_token,
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
