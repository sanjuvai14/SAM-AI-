import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are SAM, a private personal AI assistant. Be useful, concise, and practical. Reply in the same language the user uses unless they explicitly request another language. Never claim an action was completed unless it actually was. For important actions, clearly state what is verified and what still needs authorization or credentials.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SAM is ready, but OPENAI_API_KEY is not available in this deployment." },
        { status: 503 }
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-12).filter((item: any) =>
        (item?.role === "user" || item?.role === "assistant") && typeof item?.content === "string"
      ),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.4 }),
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "AI provider request failed." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: data?.choices?.[0]?.message?.content || "SAM received the request but returned no text."
    });
  } catch {
    return NextResponse.json({ error: "Invalid request or server error." }, { status: 500 });
  }
}
