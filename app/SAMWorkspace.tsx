"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "আজকের কাজগুলো priority অনুযায়ী সাজাও",
  "আমার জন্য একটি business plan-এর outline বানাও",
  "এই সপ্তাহের content plan তৈরি করো",
  "আমার code-এর সমস্যা খুঁজে বের করো",
];

export default function SAMWorkspace() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "আমি SAM। তোমার private AI workspace প্রস্তুত। কী কাজ করতে হবে বলো।" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sam-chat");
    if (saved) try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("sam-chat", JSON.stringify(messages));
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((old) => [...old, {
        role: "assistant",
        content: data.message || data.answer || data.error || "কোনো উত্তর পাওয়া যায়নি।",
      }]);
    } catch {
      setMessages((old) => [...old, { role: "assistant", content: "সার্ভারে সংযোগ করা যাচ্ছে না। একটু পরে আবার চেষ্টা করো।" }]);
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = "bn-BD";
    r.interimResults = false;
    r.onstart = () => setVoice(true);
    r.onend = () => setVoice(false);
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
    r.start();
  }

  function clear() {
    const first = [{ role: "assistant" as const, content: "নতুন conversation শুরু হয়েছে। কী করতে হবে বলো।" }];
    setMessages(first);
    localStorage.removeItem("sam-chat");
  }

  return (
    <main className="sam-app">
      <aside className="sam-side">
        <div className="sam-brand"><div className="sam-mark">S</div><div><b>SAM</b><small>PRIVATE AI</small></div></div>
        <button className="sam-new" onClick={clear}>＋ New conversation</button>
        <div className="sam-nav">
          <button className="selected">⌂ <span>Workspace</span></button>
          <button>◫ <span>Projects</span></button>
          <button>◷ <span>Tasks & automation</span></button>
          <button>▱ <span>Library</span></button>
          <button>⚙ <span>Settings</span></button>
        </div>
        <div className="sam-footer"><span className="online"/> Private workspace<small>Database and external integrations can be connected later.</small></div>
      </aside>

      <section className="sam-main">
        <header className="sam-header"><div><b>SAM Workspace</b><small>Private · ready for setup</small></div><button onClick={clear}>Clear</button></header>
        <div className="sam-chat">
          <div className="sam-welcome">
            <div className="sam-orb">S</div>
            <div className="sam-kicker">PRIVATE AI ASSISTANT</div>
            <h1>What can I help you build?</h1>
            <p>Think, create, plan and work from one private workspace.</p>
          </div>

          <div className="sam-messages">
            {messages.map((m, i) => (
              <div className={`sam-msg ${m.role}`} key={i}>
                <div className="sam-avatar">{m.role === "assistant" ? "S" : "You"}</div>
                <div className="sam-bubble">{m.content}</div>
              </div>
            ))}
            {busy && <div className="sam-msg assistant"><div className="sam-avatar">S</div><div className="sam-bubble sam-typing">● ● ●</div></div>}
            <div ref={end}/>
          </div>

          {messages.length === 1 && <div className="sam-starters">{starters.map((s) => <button key={s} onClick={() => send(s)}>✦ {s}</button>)}</div>}

          <form className="sam-compose" onSubmit={(e: FormEvent) => { e.preventDefault(); send(); }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="SAM-কে কিছু বলো…" rows={1}/>
            <button type="button" className={voice ? "voice active" : "voice"} onClick={startVoice}>◉</button>
            <button className="sam-send" disabled={!input.trim() || busy}>➤</button>
          </form>
          <div className="sam-note">Important information should be verified before acting.</div>
        </div>
      </section>
    </main>
  );
}
