import { NextResponse } from "next/server";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM =
  "You are SAM, a private personal AI assistant. Reply in the user's language. " +
  "Be practical and concise. Never claim an action was completed unless it actually was. " +
  "For important actions, clearly state what is verified and what still needs external access.";

export async function GET() {
  return NextResponse.json({ ok: true, service: "sam-ai", provider: process.env.AI_PROVIDER || "openai" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages as Msg[] : [];
    const provider = process.env.AI_PROVIDER || "openai";
    const key = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;

    if (provider !== "openai") {
      return NextResponse.json({ error: "AI provider is not configured for this deployment yet." }, { status: 503 });
    }
    if (!key) {
      return NextResponse.json({ error: "SAM is ready, but the server-side AI API key is not configured yet." }, { status: 503 });
    }

    const clean = messages
      .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM }, ...clean],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "AI provider request failed." },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    return NextResponse.json({
      answer: data?.choices?.[0]?.message?.content || "No response returned.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request or server error." }, { status: 400 });
  }
}
