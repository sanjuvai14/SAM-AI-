import { NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { samRepositories } from "@/lib/repositories";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { userId } = await requireSupabaseAuthContext(request as import("next/server").NextRequest);
    const { jobs } = samRepositories();
    const { id } = await context.params;
    const job = await jobs.get(id, userId);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job, verification: { status: "not_executed" } });
  } catch {
    return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { userId } = await requireSupabaseAuthContext(request as import("next/server").NextRequest);
    const { jobs, audit } = samRepositories();
    const { id } = await context.params;
    const job = await jobs.get(id, userId);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const body = await request.json();
    const decision = body?.decision;
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
    }

    if (decision === "reject") {
      if (job.status !== "awaiting_approval") return NextResponse.json({ error: "Only awaiting-approval jobs can be rejected." }, { status: 409 });
      const updated = await jobs.transition(id, userId, "failed", "Rejected by user.");
      await audit.append({ id: crypto.randomUUID(), userId, jobId: id, eventType: "job.rejected", action: job.action, verificationStatus: "blocked", metadata: {}, createdAt: new Date().toISOString() });
      return NextResponse.json({ job: updated, verification: { status: "blocked", note: "Rejected. No external action was executed." } });
    }

    if (job.status !== "awaiting_approval") return NextResponse.json({ error: "Only awaiting-approval jobs can be approved." }, { status: 409 });
    const updated = await jobs.transition(id, userId, "queued");
    await audit.append({ id: crypto.randomUUID(), userId, jobId: id, eventType: "job.approved", action: job.action, verificationStatus: "not_executed", metadata: {}, createdAt: new Date().toISOString() });
    return NextResponse.json({ job: updated, verification: { status: "not_executed", note: "Approval persisted. No external action was executed." } });
  } catch {
    return NextResponse.json({ error: "Authenticated SAM approval operation failed." }, { status: 401 });
  }
}
