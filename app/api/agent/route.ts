import { NextResponse } from "next/server";
import { buildCommandProposal } from "@/lib/command-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) return NextResponse.json({ error:"input is required" }, {status:400});
    const result = buildCommandProposal(input);
    return NextResponse.json({ ok:true, result });
  } catch {
    return NextResponse.json({ error:"Agent planning failed" }, {status:500});
  }
}
