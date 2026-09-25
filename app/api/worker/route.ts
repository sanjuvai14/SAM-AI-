import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Job = {
  id: string;
  action: string;
  attempt_count: number;
  max_attempts: number;
  payload: Record<string, unknown>;
};

export async function GET(request: Request) {
  const secret = process.env.SAM_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.SAM_SUPABASE_URL;
  const token = process.env.SAM_SUPABASE_ACCESS_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "Worker storage is not configured" }, { status: 503 });

  async function query<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url.replace(/\/$/, "") + path, {
      ...init,
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
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

  try {
    const jobs = await query<Job[]>("/rest/v1/rpc/claim_sam_jobs", {
      method: "POST",
      body: JSON.stringify({ p_limit: 10 }),
    });

    const results: Array<{ id: string; status: string; reason?: string }> = [];

    for (const job of jobs ?? []) {
      try {
        // Provider execution is intentionally fail-closed until a real, authorized
        // platform adapter and credentials are configured. Never fake success.
        throw new Error("provider_not_configured");
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

        results.push({ id: job.id, status: retry ? "queued" : "failed", reason: message });
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
