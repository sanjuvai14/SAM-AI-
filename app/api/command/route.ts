import { NextResponse } from "next/server";
import { buildCommandProposal } from "@/lib/command-engine";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sam-command-engine",
    mode: "proposal-only",
    note: "This endpoint classifies commands and creates safe action proposals. It never executes external actions.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript = typeof body?.transcript === "string" ? body.transcript : "";
    const confidence = typeof body?.confidence === "number" ? body.confidence : null;
    const proposal = buildCommandProposal(transcript, confidence);

    if (proposal.intent === "unknown" && proposal.requiresApproval) {
      return NextResponse.json({ proposal, verification: { status: "blocked", note: "Exact action could not be identified safely." } }, { status: 422 });
    }

    return NextResponse.json({
      proposal,
      verification: {
        status: "not_executed",
        note: proposal.requiresApproval
          ? "Proposal created. No external action was executed; explicit approval and a verified integration are still required."
          : "No external action was executed.",
      },
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid command request." }, { status: 400 });
  }
}
