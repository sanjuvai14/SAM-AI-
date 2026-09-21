import { NextResponse } from "next/server";

type Message = { role: "user" | "assistant" | "system"; content: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: Message[]; language?: string };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
    if (!messages.length) {
      return NextResponse.json({ error: "No messages supplied." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        mode: "demo",
        message: "SAM is ready. Connect the owner-controlled AI API key in Vercel to enable live AI replies."
      });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const language = typeof body.language === "string" ? body.language : "auto";
    const system = [
      "You are SAM, a private personal AI assistant.",
      "Be concise, practical, and honest about what you can actually do.",
      "Reply in the user's language unless they explicitly request another language.",
      "Do not claim an external action was completed unless the system actually performed it.",
      language !== "auto" ? `Preferred response language: ${language}.` : ""
    ].filter(Boolean).join(" ");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.4
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: "AI provider request failed.", detail }, { status: 502 });
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "AI provider returned no message." }, { status: 502 });
    }

    return NextResponse.json({ mode: "live", message });
  } catch {
    return NextResponse.json({ error: "Invalid request or temporary server error." }, { status: 400 });
  }
}
