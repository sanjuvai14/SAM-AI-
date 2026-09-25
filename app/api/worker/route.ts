import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Job = {
  id: string;
  action: string;
};

export async function GET(request: Request) {
  const secret = process.env.SAM_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.SAM_SUPABASE_URL;
  const token = process.env.SAM_SUPABASE_ACCESS_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Worker storage is not configured" }, { status: 503 });
  }

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
    if (!response.ok) throw new Error(`Queue operation failed: HTTP ${response.status}`);
    const body = await response.text();
    return body ? (JSON.parse(body) as T) : ([] as T);
  }

  try {
    const jobs = await query<Job[]>("/rest/v1/sam_jobs?status=eq.queued&order=created_at.asc&limit=10");
    const results: Array<{ id: string; status: string; reason?: string }> = [];

    for (const job of jobs ?? []) {
      const claimed = await query<Job[]>(
        `/rest/v1/sam_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.queued`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "running",
            error: null,
          }),
        },
      );

      if (!claimed?.[0]) continue;

      // Provider adapters are deliberately not enabled until the corresponding
      // OAuth/API credentials exist. Never report an external action as success
      // without a provider response and independent verification.
      await query(
        `/rest/v1/sam_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.running`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "failed",
            error:
              "No provider execution adapter is configured for this action. Job was not falsely reported as completed.",
          }),
        },
      );

      results.push({
        id: job.id,
        status: "failed",
        reason: "provider_not_configured",
      });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch {
    return NextResponse.json({ error: "Worker queue operation failed." }, { status: 503 });
  }
}
