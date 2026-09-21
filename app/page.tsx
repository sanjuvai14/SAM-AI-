"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const starter: ChatMessage[] = [
  {
    role: "assistant",
    content: "আমি SAM। কী করতে চান বলুন—আমি আপনার কথার ভাষাতেই উত্তর দেব।"
  }
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(starter);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("auto");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("sam-chat");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sam-chat", JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, language })
      });
      const data = await response.json();
      const reply = typeof data.message === "string"
        ? data.message
        : "এই মুহূর্তে উত্তর দিতে পারছি না। API configuration যাচাই করুন।";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, {
        role: "assistant",
        content: "সংযোগে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।"
      }]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages(starter);
    window.localStorage.removeItem("sam-chat");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SAM</strong><small>PRIVATE AI</small></div></div>
        <button className="new-chat" onClick={clearChat}>＋ New chat</button>
        <div className="side-section"><span>Workspace</span><button>▣ Assistant</button><button>◷ Tasks</button><button>◇ Automations</button><button>⚙ Settings</button></div>
        <div className="side-bottom"><span className="secure-dot"/> Owner workspace<br/><small>External services can be connected later.</small></div>
      </aside>

      <section className="chat">
        <header className="topbar">
          <div><div className="eyebrow">PRIVATE ASSISTANT</div><h1>SAM</h1></div>
          <div className="top-actions"><select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Response language"><option value="auto">Auto language</option><option value="বাংলা">বাংলা</option><option value="English">English</option><option value="हिन्दी">हिन्दी</option></select><button onClick={clearChat}>Clear</button></div>
        </header>

        <div className="messages">
          <div className="welcome"><div className="orb">S</div><h2>How can SAM help?</h2><p>Ask questions, plan work, write content, analyze ideas, or organize tasks.</p></div>
          {messages.map((message, index) => (
            <div className={`message-row ${message.role}`} key={index}>
              <div className="avatar">{message.role === "assistant" ? "S" : "You"}</div>
              <div className="bubble">{message.content}</div>
            </div>
          ))}
          {busy && <div className="message-row assistant"><div className="avatar">S</div><div className="bubble typing">SAM is thinking…</div></div>}
          <div ref={endRef}/>
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} placeholder="Message SAM…" rows={1} disabled={busy}/>
          <button className="send" type="submit" disabled={busy || !input.trim()}>↑</button>
        </form>
        <p className="disclaimer">SAM can make mistakes. Verify important information and actions.</p>
      </section>
    </main>
  );
}
