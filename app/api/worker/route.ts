import { NextResponse } from "next/server";


export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.SAM_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.SAM_SUPABASE_URL;
  const token = process.env.SAM_SUPABASE_ACCESS_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "Worker storage is not configured" }, { status: 503 });

  async function query(path: string, init: RequestInit = {}) {
    const response = await fetch(url.replace(/\/$/, "") + path, {
      ...init,
      headers: { apikey: token, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Queue operation failed");
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  }
  const data = await query("/rest/v1/sam_jobs?status=eq.queued&order=created_at.asc&limit=10");
  const results = [];
  for (const job of data ?? []) {
    const { data: claimed } = await query(`/rest/v1/sam_jobs?id=eq.${encodeURIComponent(job.id)}&status=eq.queued`, {method:"PATCH", body:JSON.stringify({status:"running",started_at:new Date().toISOString(),error:null})});
    if (!claimed) continue;
    // External providers are executed only by configured provider adapters.
    // Never report success until the provider returns a verifiable result.
    await db.from("sam_jobs").update({
      status:"failed",
      error:"No provider execution adapter is configured for this action. Job was not falsely reported as completed."
    }).eq("id",job.id).eq("status","running");
    results.push({id:job.id,status:"failed",reason:"provider_not_configured"});
  }
  return NextResponse.json({ ok:true, processed:results.length, results });
}
