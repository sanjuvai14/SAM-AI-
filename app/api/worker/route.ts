import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const db = createClient(url, token, { auth: { persistSession: false } });
  const { data, error } = await db.from("sam_jobs").select("id,user_id,action,title,payload,status").eq("status","queued").order("created_at",{ascending:true}).limit(10);
  if (error) return NextResponse.json({ error: "Queue read failed" }, { status: 503 });

  const results = [];
  for (const job of data ?? []) {
    const { data: claimed } = await db.from("sam_jobs").update({status:"running",started_at:new Date().toISOString(),error:null}).eq("id",job.id).eq("status","queued").select("id").maybeSingle();
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
