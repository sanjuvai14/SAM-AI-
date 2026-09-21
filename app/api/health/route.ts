import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "SAM",
    version: "4.10.46-release-prep",
    timestamp: new Date().toISOString(),
  });
}
