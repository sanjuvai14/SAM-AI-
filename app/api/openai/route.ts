import { NextResponse } from "next/server";

type Msg = { role: "user" | "assistant"; content: string };

function cleanMessages(input: unknown): Msg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m): m is Msg =>
      !!m &&
      typeof m === "object" &&
      (((m as Msg).role === "user") || ((m as Msg).role === "assistant")) &&
      typeof (m as Msg).content === "string"
    )
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

    if (provider !== "openai") {
      return NextResponse.json(
        { error: "SAM's configured AI provider is not supported by this endpoint yet." },
        { status: 503 }
      );
    }

    const key = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "SAM is ready, but the server-side AI API key is not configured." },
        { status: 503 }
      );
    }

    const messages = cleanMessages(body?.messages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "A user message is required." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are SAM, a private personal AI assistant. Reply in the user's language. Be practical, concise, honest about limitations, and never claim an action was completed unless it actually was.",
          },
          ...messages,
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "The AI provider request failed." },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    return NextResponse.json({
      answer: data?.choices?.[0]?.message?.content || "No response was returned.",
    });
  } catch {
    return NextResponse.json(
      { error: "SAM could not process the request." },
      { status: 400 }
    );
  }
}
