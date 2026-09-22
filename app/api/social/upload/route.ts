import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { getSocialConnection } from "@/lib/social-connections";
import { youtubeUpload } from "@/lib/youtube";
import { facebookPageVideo, instagramReel, metaVerify } from "@/lib/meta";
import { tiktokDirectPostFromUrl } from "@/lib/tiktok";

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
      const result = await youtubeUpload(connection.access_token, video, String(form.get("title") || "SAM upload"), String(form.get("description") || ""), (String(form.get("privacyStatus") || "private")) as "private" | "public" | "unlisted");
      return NextResponse.json({ platform, result });
    }

    if (platform === "meta") {
      const mode = String(form.get("mode") || "facebook");
      const video = form.get("video");
      const caption = String(form.get("caption") || "");
      const verified = await metaVerify(connection.access_token);
      if (!verified.verified || !verified.pages.length) return NextResponse.json({ error: "No verified Facebook Page connection found." }, { status: 409 });
      const page = verified.pages[0];
      const pageToken = page.access_token as string;
      if (mode === "facebook") {
        if (!(video instanceof Blob)) return NextResponse.json({ error: "Facebook upload requires a video file." }, { status: 400 });
        const result = await facebookPageVideo(pageToken, page.id, video, caption);
        return NextResponse.json({ platform: "facebook", result });
      }
      const videoUrl = String(form.get("videoUrl") || "");
      const igId = page.instagram_business_account?.id as string | undefined;
      if (!igId || !videoUrl) return NextResponse.json({ error: "Instagram Reels requires an Instagram business account and public videoUrl." }, { status: 400 });
      const result = await instagramReel(pageToken, igId, videoUrl, caption);
      return NextResponse.json({ platform: "instagram", result });
    }

    if (platform === "tiktok") {
      const videoUrl = String(form.get("videoUrl") || "");
      if (!videoUrl) return NextResponse.json({ error: "TikTok Direct Post requires a public videoUrl." }, { status: 400 });
      const result = await tiktokDirectPostFromUrl(connection.access_token, videoUrl, String(form.get("title") || ""), String(form.get("privacyLevel") || "SELF_ONLY"), String(form.get("isAigc") || "false") === "true");
      return NextResponse.json({ platform: "tiktok", result });
    }

    return NextResponse.json({ error: "Unsupported social platform." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social upload failed.", verification: { verified: false } }, { status: 400 });
  }
}
