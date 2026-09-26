import { NextResponse } from "next/server";
import { getSocialConnection } from "@/lib/social-connections";
import { youtubeUpload } from "@/lib/youtube";
import { facebookPageVideo, instagramReel, metaVerify } from "@/lib/meta";
import { tiktokDirectPostFromUrl } from "@/lib/tiktok";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Job = {
  id: string;
  action: string;
  attempt_count: number;
  max_attempts: number;
  payload: Record<string, unknown>;
};

async function fetchBlob(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`media_fetch_failed:${response.status}`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("media_empty");
  return blob;
}

export async function GET(request: Request) {
  const secret = process.env.SAM_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SAM_SUPABASE_URL;
  const token = process.env.SAM_SUPABASE_ACCESS_TOKEN;
  if (!supabaseUrl || !token) return NextResponse.json({ error: "Worker storage is not configured" }, { status: 503 });
  const supabaseBaseUrl = supabaseUrl;
  const accessToken = token;

  async function query<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(supabaseBaseUrl.replace(/\/$/, "") + path, {
      ...init,
      headers: {
        apikey: accessToken,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Queue operation failed: HTTP ${response.status} ${detail.slice(0, 300)}`);
    }
    const body = await response.text();
    return body ? (JSON.parse(body) as T) : ([] as T);
  }

  async function audit(job: Job, eventType: string, status: "not_executed" | "verified" | "failed" | "blocked", metadata: Record<string, unknown>) {
    await query("/rest/v1/sam_audit_events", {
      method: "POST",
      body: JSON.stringify({
        user_id: (job.payload.user_id as string) || null,
        job_id: job.id,
        event_type: eventType,
        action: job.action,
        verification_status: status,
        metadata,
      }),
    }).catch(() => undefined);
  }

  async function execute(job: Job) {
    const userId = typeof job.payload.user_id === "string" ? job.payload.user_id : "";
    if (!userId) throw new Error("job_user_missing");

    const mediaUrl = typeof job.payload.videoUrl === "string" ? job.payload.videoUrl : "";
    const title = typeof job.payload.title === "string" ? job.payload.title : job.action;
    const description = typeof job.payload.description === "string" ? job.payload.description : "";
    const caption = typeof job.payload.caption === "string" ? job.payload.caption : description;

    if (job.action === "youtube.upload") {
      if (!mediaUrl) throw new Error("youtube_videoUrl_required");
      const connection = await getSocialConnection(userId, "youtube");
      if (!connection) throw new Error("youtube_not_connected");
      return youtubeUpload(
        connection.access_token,
        await fetchBlob(mediaUrl),
        title,
        description,
        (job.payload.privacyStatus as "private" | "public" | "unlisted") || "private"
      );
    }

    if (job.action === "facebook.video") {
      if (!mediaUrl) throw new Error("facebook_videoUrl_required");
      const connection = await getSocialConnection(userId, "meta");
      if (!connection) throw new Error("meta_not_connected");
      const verified = await metaVerify(connection.access_token);
      if (!verified.verified || !verified.pages.length) throw new Error("facebook_page_not_verified");
      const page = verified.pages[0];
      return facebookPageVideo(page.access_token as string, page.id as string, await fetchBlob(mediaUrl), caption);
    }

    if (job.action === "instagram.video") {
      if (!mediaUrl) throw new Error("instagram_videoUrl_required");
      const connection = await getSocialConnection(userId, "meta");
      if (!connection) throw new Error("meta_not_connected");
      const verified = await metaVerify(connection.access_token);
      const page = verified.pages[0];
      const igId = page?.instagram_business_account?.id as string | undefined;
      if (!verified.verified || !igId) throw new Error("instagram_business_account_not_verified");
      return instagramReel(connection.access_token, igId, mediaUrl, caption);
    }

    if (job.action === "tiktok.video") {
      if (!mediaUrl) throw new Error("tiktok_videoUrl_required");
      const connection = await getSocialConnection(userId, "tiktok");
      if (!connection) throw new Error("tiktok_not_connected");
      return tiktokDirectPostFromUrl(
        connection.access_token,
        mediaUrl,
        title,
        typeof job.payload.privacyLevel === "string" ? job.payload.privacyLevel : "SELF_ONLY",
        job.payload.isAigc === true
      );
    }

    if (job.action === "youtube.seo") {
      throw new Error("youtube_seo_requires_content_api_adapter");
    }

    throw new Error("unsupported_job_action");
  }

  try {
    const jobs = await query<Job[]>("/rest/v1/rpc/claim_sam_jobs", {
      method: "POST",
      body: JSON.stringify({ p_limit: 10 }),
    });

    const results: Array<{ id: string; status: string; reason?: string; verification?: boolean }> = [];

    for (const job of jobs ?? []) {
      try {
        const result = await execute(job);
        const completedAt = new Date().toISOString();
        await query(`/rest/v1/sam_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.running`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "succeeded",
            error: null,
            completed_at: completedAt,
            next_run_at: completedAt,
          }),
        });
        await audit(job, "job_succeeded", "verified", { result: { ...result, verification: { verified: true, checkedAt: completedAt } } });
        results.push({ id: job.id, status: "succeeded", verification: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "provider_execution_failed";
        const retry = job.attempt_count < job.max_attempts;
        const nextRun = new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** job.attempt_count * 60_000)).toISOString();

        await query(`/rest/v1/sam_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.running`, {
          method: "PATCH",
          body: JSON.stringify({
            status: retry ? "queued" : "failed",
            error: message,
            next_run_at: retry ? nextRun : new Date().toISOString(),
            completed_at: retry ? null : new Date().toISOString(),
          }),
        });

        await audit(job, retry ? "job_retry_scheduled" : "job_failed", "failed", {
          reason: message,
          attempt_count: job.attempt_count,
          retry_scheduled: retry,
          next_run_at: retry ? nextRun : null,
        });

        results.push({ id: job.id, status: retry ? "queued" : "failed", reason: message, verification: false });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    return NextResponse.json({
      error: "Worker queue operation failed.",
      detail: error instanceof Error ? error.message : "unknown",
    }, { status: 503 });
  }
}
