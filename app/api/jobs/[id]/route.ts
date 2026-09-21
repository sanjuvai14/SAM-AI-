import { NextResponse } from "next/server";
import { getJob, transitionJob } from "@/lib/job-store";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  return NextResponse.json({ job, verification: { status: "not_executed" } });
}

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  try {
    const body = await request.json();
    const decision = body?.decision;
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
    }

    if (decision === "reject") {
      const updated = transitionJob(id, "failed", "Rejected by user.");
      return NextResponse.json({
        job: updated,
        verification: { status: "not_executed", note: "The job was rejected. No external action was executed." },
      });
    }

    if (job.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Only awaiting-approval jobs can be approved." }, { status: 409 });
    }

    const updated = transitionJob(id, "queued");
    return NextResponse.json({
      job: updated,
      verification: { status: "queued_not_executed", note: "Approval recorded in the ephemeral scaffold. No external action was executed." },
    });
  } catch {
    return NextResponse.json({ error: "Invalid approval request." }, { status: 400 });
  }
}
