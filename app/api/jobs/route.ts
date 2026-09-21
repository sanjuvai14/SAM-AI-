import { NextResponse } from "next/server";
import { ACTIONS, createAutomation, type AutomationAction } from "@/lib/automation";
import { listJobs, saveJob } from "@/lib/job-store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sam-jobs",
    mode: "ephemeral-scaffold",
    persistence: "not_configured",
    jobs: listJobs(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as AutomationAction;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

    if (!action || !(action in ACTIONS)) {
      return NextResponse.json({ error: "Unsupported automation action." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "A job title is required." }, { status: 400 });
    }

    const job = saveJob(createAutomation({ action, title: title.slice(0, 200), payload }));
    return NextResponse.json({
      job,
      verification: {
        status: "not_executed",
        note: "Job stored only in the current server process. No external action was executed. Durable storage, approval authentication, OAuth execution, and post-action verification are not configured yet.",
      },
    }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid job request." }, { status: 400 });
  }
}
