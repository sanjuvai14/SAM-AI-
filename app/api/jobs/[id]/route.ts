import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { samRepositories } from "@/lib/repositories";

type Context = { params: Promise<{ id: string }> };

function isAuthError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes("Authenticated SAM session required") ||
    error.message.includes("SAM session verification failed") ||
    error.message.includes("SAM authentication provider is not configured")
  );
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const { jobs } = samRepositories();
    const { id } = await context.params;
    const job = await jobs.get(id, userId);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job, verification: { status: "not_executed" } });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
    }
    return NextResponse.json({ error: "SAM job storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
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
      if (job.status !== "awaiting_approval") {
        return NextResponse.json({ error: "Only awaiting-approval jobs can be rejected." }, { status: 409 });
      }
      const updated = await jobs.transition(
        id,
        userId,
        "failed",
        "Rejected by user.",
        "awaiting_approval"
      );
      await audit.append({
        id: crypto.randomUUID(),
        userId,
        jobId: id,
        eventType: "job.rejected",
        action: job.action,
        verificationStatus: "blocked",
        metadata: {},
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({
        job: updated,
        verification: { status: "blocked", note: "Rejected. No external action was executed." },
      });
    }

    if (job.status !== "awaiting_approval") {
      return NextResponse.json({ error: "Only awaiting-approval jobs can be approved." }, { status: 409 });
    }

    const updated = await jobs.transition(
      id,
      userId,
      "queued",
      undefined,
      "awaiting_approval"
    );
    await audit.append({
      id: crypto.randomUUID(),
      userId,
      jobId: id,
      eventType: "job.approved",
      action: job.action,
      verificationStatus: "not_executed",
      metadata: {},
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      job: updated,
      verification: { status: "not_executed", note: "Approval persisted. No external action was executed." },
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
    }
    return NextResponse.json({ error: "SAM approval operation failed because persistent storage is unavailable." }, { status: 503 });
  }
}
