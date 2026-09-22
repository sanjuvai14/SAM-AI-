import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.SAM_SUPABASE_URL;
  const anonKey = process.env.SAM_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "SAM authentication provider is not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const response = await fetch(
      url.replace(/\/$/, "") + "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data?.access_token !== "string") {
      return NextResponse.json({ error: "SAM login failed." }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : null,
      user: data.user ?? null,
    });
  } catch {
    return NextResponse.json({ error: "SAM login request failed." }, { status: 400 });
  }
}
