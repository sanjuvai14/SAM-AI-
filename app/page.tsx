'use client';

import { FormEvent, useEffect, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starter: Message[] = [
  {
    role: "assistant",
    content:
      "আমি SAM। তোমার private AI workspace প্রস্তুত। Supabase/database ও অতিরিক্ত integrations পরে যুক্ত করা যাবে—এখন এই workspace থেকেই AI chat ব্যবহার করতে পারবে।",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sam-chat");
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sam-chat", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.content || "কোনো উত্তর পাওয়া যায়নি।" },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI connection failed";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `AI এখনো সম্পূর্ণভাবে সংযুক্ত হয়নি। কারণ: ${message}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages(starter);
    localStorage.removeItem("sam-chat");
  }

  return (
    <main className="sam-shell">
      <aside className="sam-sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div><strong>SAM</strong><span>PRIVATE AI</span></div>
        </div>
        <button className="new-chat" onClick={clearChat}>＋ New chat</button>
        <div className="side-note">
          <strong>Workspace</strong>
          <p>Local chat history is saved on this device. Cloud database can be added later.</p>
        </div>
        <div className="side-footer">SAM • Private workspace</div>
      </aside>

      <section className="sam-main">
        <header className="topbar">
          <div>
            <h1>SAM</h1>
            <p>Your private AI assistant</p>
          </div>
          <div className="ready"><i /> Ready</div>
        </header>

        <div className="chat">
          {messages.map((m, i) => (
            <div className={`message-row ${m.role}`} key={i}>
              <div className="avatar">{m.role === "assistant" ? "S" : "You"}</div>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="message-row assistant">
              <div className="avatar">S</div>
              <div className="bubble typing">SAM is thinking…</div>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={send}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="SAM-কে কিছু জিজ্ঞেস করো…"
            rows={1}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send">➤</button>
        </form>
        <div className="privacy">Private workspace • API keys stay server-side • Cloud integrations can be connected later</div>
      </section>
    </main>
  );
}
