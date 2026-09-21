import { NextResponse } from "next/server";
import { ACTIONS, createAutomation, type AutomationAction } from "@/lib/automation";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";
import { samRepositories } from "@/lib/repositories";

export async function GET(request: Request) {
  try {
    const { userId } = await requireSupabaseAuthContext(request as import("next/server").NextRequest);
    const { jobs } = samRepositories();
    return NextResponse.json({ ok: true, service: "sam-jobs", mode: "persistent", jobs: await jobs.list(userId) });
  } catch {
    return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireSupabaseAuthContext(request as import("next/server").NextRequest);
    const body = await request.json();
    const action = body?.action as AutomationAction;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

    if (!action || !(action in ACTIONS)) return NextResponse.json({ error: "Unsupported automation action." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "A job title is required." }, { status: 400 });

    const job = createAutomation({ action, title: title.slice(0, 200), payload });
    const { jobs, audit } = samRepositories();
    await jobs.create(job, userId);
    await audit.append({
      id: crypto.randomUUID(),
      userId,
      jobId: job.id,
      eventType: "job.created",
      action: job.action,
      verificationStatus: "not_executed",
      metadata: { status: job.status },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ job, verification: { status: "not_executed", note: "Job persisted. No external action was executed." } }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Authenticated SAM job creation failed." }, { status: 401 });
  }
}
