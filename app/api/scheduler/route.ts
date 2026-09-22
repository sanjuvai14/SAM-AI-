import { NextRequest, NextResponse } from "next/server";
import { samRepositories } from "@/lib/repositories";
import { processQueuedJob } from "@/lib/job-worker";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Scheduler authentication is not configured or failed." }, { status: 401 });
  return NextResponse.json({ ok: true, service: "sam-scheduler", mode: "queue-gate", execution: "not_executed", timestamp: new Date().toISOString(), note: "Scheduler authentication passed. Use POST with an owned queued job identity to invoke the fail-closed worker." });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Scheduler authentication is not configured or failed." }, { status: 401 });
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const jobId = typeof body?.jobId === "string" ? body.jobId : "";
    if (!userId || !jobId) return NextResponse.json({ error: "userId and jobId are required." }, { status: 400 });

    const { jobs, audit } = samRepositories();
    const job = await jobs.get(jobId, userId);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    if (job.status !== "queued") return NextResponse.json({ error: "Only queued jobs may enter the worker." }, { status: 409 });

    const completed = await processQueuedJob(job, userId, jobs, audit);
    return NextResponse.json({ ok: true, job: completed, verification: { status: "blocked", note: "Worker reached the execution boundary but no verified external adapter is configured; no external action was performed." } });
  } catch {
    return NextResponse.json({ error: "Scheduler worker execution failed." }, { status: 503 });
  }
}
