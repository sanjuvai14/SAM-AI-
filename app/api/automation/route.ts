import { NextResponse } from "next/server";
import { ACTIONS, createAutomation, type AutomationAction } from "../../../lib/automation";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sam-automation",
    mode: "approval-gated",
    actions: Object.entries(ACTIONS).map(([id, config]) => ({ id, ...config })),
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

    const job = createAutomation({ action, title: title.slice(0, 200), payload });
    return NextResponse.json({
      job,
      verification: {
        status: "not_executed",
        note: "The job is prepared but no external post/upload was performed. OAuth/API execution and result verification are required before reporting success.",
      },
    }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid automation request." }, { status: 400 });
  }
}
