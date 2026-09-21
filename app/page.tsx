"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "আমি SAM। কী কাজ করতে চান?" }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    const next = [...messages, { role: "user" as const, content: message }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages })
      });
      const data = await response.json();
      setMessages([...next, {
        role: "assistant",
        content: data.message || `সমস্যা হয়েছে: ${data.error || "Unknown error"}`
      }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SAM</strong><small>PRIVATE AI</small></div></div>
        <button className="new-chat" onClick={() => setMessages([{ role: "assistant", content: "আমি SAM। কী কাজ করতে চান?" }])}>＋ New chat</button>
        <div className="side-note">Private assistant workspace</div>
      </aside>

      <section className="chat">
        <header className="topbar"><div><b>SAM</b><span>Private AI Assistant</span></div><span className="online">● Online</span></header>
        <div className="messages">
          {messages.map((item, index) => (
            <div key={index} className={`message-row ${item.role}`}>
              <div className="avatar">{item.role === "assistant" ? "S" : "You"}</div>
              <div className="bubble">{item.content}</div>
            </div>
          ))}
          {busy && <div className="message-row assistant"><div className="avatar">S</div><div className="bubble">SAM is thinking…</div></div>}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="SAM-কে কিছু লিখুন…" disabled={busy} />
          <button type="submit" disabled={busy || !input.trim()}>Send</button>
        </form>
      </section>
    </main>
  );
}
