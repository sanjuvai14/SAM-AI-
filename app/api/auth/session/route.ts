import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSupabaseAuthContext(request);
    return NextResponse.json({ authenticated: true, userId: auth.userId });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
