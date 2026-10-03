import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuthContext } from "@/lib/supabase-auth";

function isAuthError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes("Authenticated SAM session required") ||
    error.message.includes("SAM session verification failed") ||
    error.message.includes("SAM authentication provider is not configured")
  );
}

export async function POST(request: NextRequest) {
  try {
    await requireSupabaseAuthContext(request);
    const body = await request.json();
    const messages = Array.isArray(body?.messages)
      ? body.messages
          .filter((m: { role?: string; content?: string }) =>
            (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
          )
          .slice(-20)
          .map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content.slice(0, 12000),
          }))
      : [];

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
    if (!apiKey || provider !== "openai") {
      return NextResponse.json(
        { reply: "SAM is ready. Connect an AI provider credential to enable live AI responses." },
        { status: 503 }
      );
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are SAM, a private personal AI assistant. Reply in the user's language. Be concise, practical, and verify important actions before execution.",
          },
          ...messages,
        ],
        temperature: 0.4,
      }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { reply: "AI provider returned an error. Check the server-side provider configuration." },
        { status: 502 }
      );
    }
    const data = await upstream.json();
    return NextResponse.json({
      reply: data?.choices?.[0]?.message?.content || "No response received.",
    });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Authenticated SAM session required." }, { status: 401 });
    }
    return NextResponse.json({ reply: "SAM could not process that request right now." }, { status: 400 });
  }
}
