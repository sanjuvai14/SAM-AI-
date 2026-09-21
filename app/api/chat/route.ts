import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

    if (!apiKey || provider !== "openai") {
      return NextResponse.json({ reply: "SAM is ready. Connect an AI provider credential to enable live AI responses." });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are SAM, a private personal AI assistant. Reply in the user's language. Be concise, practical, and verify important actions before execution." },
          ...messages.filter((m: { role?: string; content?: string }) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-20)
        ],
        temperature: 0.4
      })
    });

    if (!upstream.ok) {
      return NextResponse.json({ reply: "AI provider returned an error. Check the server-side provider configuration." }, { status: 502 });
    }
    const data = await upstream.json();
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || "No response received." });
  } catch {
    return NextResponse.json({ reply: "SAM could not process that request right now." }, { status: 400 });
  }
}
