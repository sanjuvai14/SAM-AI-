import { NextRequest, NextResponse } from "next/server";
import { ACTIONS, createAutomation, type AutomationAction } from "@/lib/automation";
import { AUDIT_EVENT_TYPES } from "@/lib/audit";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { samRepositories } from "@/lib/repositories";

function isAuthError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes("Authenticated SAM session required") ||
    error.message.includes("SAM session verification failed") ||
    error.message.includes("SAM authentication provider is not configured")
  );
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const { jobs } = samRepositories();
    return NextResponse.json({ ok: true, service: "sam-jobs", mode: "persistent", jobs: await jobs.list(userId) });
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
    return NextResponse.json({ error: "SAM job storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSupabaseAuthContext(request);
    const body = await request.json();
    const action = body?.action as AutomationAction;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const payload = body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
    if (!action || !(action in ACTIONS)) return NextResponse.json({ error: "Unsupported automation action." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "A job title is required." }, { status: 400 });

    const job = createAutomation({ action, title: title.slice(0, 200), payload });
    const { jobs, audit } = samRepositories();
    await jobs.create(job, userId);
    await audit.append({
      id: crypto.randomUUID(), userId, jobId: job.id,
      eventType: AUDIT_EVENT_TYPES.JOB_CREATED, action: job.action,
      verificationStatus: "not_executed", metadata: { status: job.status },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ job, verification: { status: "not_executed", note: "Job persisted. No external action was executed." } }, { status: 202 });
  } catch (error) {
    if (isAuthError(error)) return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
    return NextResponse.json({ error: "SAM job creation failed because persistent storage is unavailable." }, { status: 503 });
  }
}
