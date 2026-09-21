import { NextResponse } from "next/server";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === "Bearer " + secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Scheduler authentication is not configured or failed." },
      { status: 401 }
    );
  }

  // Queue execution remains deliberately fail-closed until the SAM-owned
  // persistent database is provisioned. This endpoint must never claim that
  // an external platform action was executed or verified.
  return NextResponse.json({
    ok: true,
    service: "sam-scheduler",
    mode: "queue-gate",
    execution: "not_executed",
    timestamp: new Date().toISOString(),
    note: "Scheduler authentication passed. Durable job execution is blocked until the SAM-owned database and worker are configured.",
  });
}
