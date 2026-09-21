"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { classifyVoiceIntent, verifyVoiceTranscript } from "@/lib/voice";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "আজকের কাজগুলো priority অনুযায়ী সাজাও",
  "আমার জন্য একটি business plan-এর outline বানাও",
  "এই সপ্তাহের content plan তৈরি করো",
  "আমার code-এর সমস্যা খুঁজে বের করো",
];

const VOICE_LANGS = [
  { value: "bn-BD", label: "বাংলা" },
  { value: "en-US", label: "English" },
  { value: "hi-IN", label: "हिन्दी" },
];

export default function SAMWorkspace() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "আমি SAM। তোমার private AI workspace প্রস্তুত। কী কাজ করতে হবে বলো।" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [voiceLang, setVoiceLang] = useState("bn-BD");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [heard, setHeard] = useState("");
  const [voiceNotice, setVoiceNotice] = useState("");
  const recognitionRef = useRef<any>(null);
  const continuousRef = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sam-chat");
    if (saved) try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch {}
    setVoiceSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    setSpeechSupported("speechSynthesis" in window);
  }, []);

  useEffect(() => {
    localStorage.setItem("sam-chat", JSON.stringify(messages));
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  useEffect(() => () => {
    continuousRef.current = false;
    recognitionRef.current?.abort?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function speak(text: string) {
    if (!speechSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#\`]/g, ""));
    utterance.lang = voiceLang;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function send(text = input, fromVoice = false) {
    const value = text.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setHeard(fromVoice ? value : "");
    setBusy(true);
    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const answer = data.message || data.answer || data.error || "কোনো উত্তর পাওয়া যায়নি।";
      setMessages((old) => [...old, { role: "assistant", content: answer }]);
      if (fromVoice && data.answer) speak(answer);
    } catch {
      const error = "সার্ভারে সংযোগ করা যাচ্ছে না। একটু পরে আবার চেষ্টা করো।";
      setMessages((old) => [...old, { role: "assistant", content: error }]);
      if (fromVoice) speak(error);
    } finally {
      setBusy(false);
    }
  }

  function stopVoice() {
    continuousRef.current = false;
    setContinuous(false);
    recognitionRef.current?.stop?.();
    setListening(false);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    continuousRef.current = continuous;
    const r = new SpeechRecognition();
    recognitionRef.current = r;
    r.lang = voiceLang;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onstart = () => {
      setListening(true);
      setHeard("");
    };

    r.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      const transcript = (finalText || interimText).trim();
      setHeard(transcript);
      if (finalText.trim()) {
        const confidence = e.results[e.resultIndex]?.[0]?.confidence;
        const verification = verifyVoiceTranscript(transcript, typeof confidence === "number" ? confidence : null);
        if (!verification.accepted) {
          setVoiceNotice("কথাটি পরিষ্কারভাবে বোঝা যায়নি—আবার বলো। SAM অনুমান করে কাজ করবে না।");
          return;
        }
        const intent = classifyVoiceIntent(transcript, typeof confidence === "number" ? confidence : null);
        setVoiceNotice(intent.type === "automation_request"
          ? "এটি একটি consequential action হতে পারে। আগে SAM কী করবে তা দেখাবে; প্রয়োজনীয় approval ছাড়া external action চালানো হবে না।"
          : "Voice command গ্রহণ করা হয়েছে।");
        setInput(transcript);
        void send(transcript, true);
      }
    };

    r.onerror = (e: any) => {
      setListening(false);
      if (e?.error !== "aborted") setHeard("Voice recognition error — আবার চেষ্টা করো।");
    };

    r.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (continuousRef.current) {
        window.setTimeout(() => {
          if (continuousRef.current && !busy) startVoice();
        }, 350);
      }
    };

    r.start();
  }

  function toggleVoice() {
    if (listening) stopVoice();
    else startVoice();
  }

  function clear() {
    const first = [{ role: "assistant" as const, content: "নতুন conversation শুরু হয়েছে। কী করতে হবে বলো।" }];
    setMessages(first);
    setInput("");
    setHeard("");
    setVoiceNotice("");
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
        <div className="sam-footer"><span className="online"/> Private workspace<small>Voice-first control · verification-first actions.</small></div>
      </aside>

      <section className="sam-main">
        <header className="sam-header">
          <div><b>SAM Workspace</b><small>Private · voice control ready</small></div>
          <div className="sam-header-actions">
            <select aria-label="Voice language" value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>
              {VOICE_LANGS.map((lang) => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
            </select>
            <button onClick={clear}>Clear</button>
          </div>
        </header>

        <div className="sam-chat">
          <div className="sam-welcome">
            <div className="sam-orb">S</div>
            <div className="sam-kicker">PRIVATE AI ASSISTANT</div>
            <h1>What can I help you build?</h1>
            <p>Speak naturally. SAM listens, reasons, and reports what it actually did.</p>
          </div>

          <div className="sam-messages">
            {messages.map((m, i) => (
              <div className={"sam-msg " + m.role} key={i}>
                <div className="sam-avatar">{m.role === "assistant" ? "S" : "You"}</div>
                <div className="sam-bubble">{m.content}</div>
              </div>
            ))}
            {busy && <div className="sam-msg assistant"><div className="sam-avatar">S</div><div className="sam-bubble sam-typing">● ● ●</div></div>}
            <div ref={end}/>
          </div>

          {messages.length === 1 && <div className="sam-starters">{starters.map((s) => <button key={s} onClick={() => send(s)}>✦ {s}</button>)}</div>}

          {voiceNotice && <div className="sam-note" aria-live="polite">{voiceNotice}</div>}

          {heard && (
            <div className="sam-voice-preview" aria-live="polite">
              <b>{listening ? "SAM is hearing:" : "SAM heard:"}</b> {heard}
            </div>
          )}

          {!voiceSupported && <div className="sam-note">এই browser-এ voice recognition নেই। Chrome/Android-এর supported browser ব্যবহার করো।</div>}

          <form className="sam-compose" onSubmit={(e: FormEvent) => { e.preventDefault(); send(); }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="SAM-কে কিছু বলো…"
              rows={1}
              aria-label="Message"
            />
            <button
              type="button"
              className={listening ? "voice active" : "voice"}
              onClick={toggleVoice}
              disabled={!voiceSupported}
              aria-label={listening ? "Stop voice control" : "Start voice control"}
              title={listening ? "Stop listening" : "Start listening"}
            >{listening ? "■" : "◉"}</button>
            <button
              type="button"
              className={continuous ? "voice active" : "voice"}
              onClick={() => setContinuous((v) => !v)}
              disabled={!voiceSupported}
              aria-label="Toggle continuous voice control"
              title="Continuous voice control"
            >∞</button>
            <button className="sam-send" disabled={!input.trim() || busy}>➤</button>
          </form>
          <div className="sam-note">
            Voice commands are transcribed before processing. SAM must not guess unclear commands, and consequential external actions remain approval-gated until the required integration is verified.
          </div>
        </div>
      </section>
    </main>
  );
}
