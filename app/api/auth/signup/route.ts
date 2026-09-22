import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.SAM_SUPABASE_URL;
  const anonKey = process.env.SAM_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "SAM authentication provider is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const response = await fetch(url.replace(/\/$/, "") + "/auth/v1/signup", {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: typeof data?.msg === "string" ? data.msg : "SAM account creation failed." }, { status: response.status });

    const result = NextResponse.json({ user: data.user ?? null, needsEmailConfirmation: !data.access_token });
    if (typeof data.access_token === "string") result.cookies.set("sam-access-token", data.access_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 3600 });
    if (typeof data.refresh_token === "string") result.cookies.set("sam-refresh-token", data.refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return result;
  } catch {
    return NextResponse.json({ error: "SAM signup request failed." }, { status: 400 });
  }
}
