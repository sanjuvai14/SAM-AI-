"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { classifyVoiceIntent, verifyVoiceTranscript } from "@/lib/voice";

type Message = { role: "user" | "assistant"; content: string };
type View = "chat" | "projects" | "tasks" | "library" | "plugins" | "device" | "settings";
type CommandProposal = { intent: string; risk: "safe" | "consequential"; transcript: string; action?: string; requiresApproval: boolean; reason: string };

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

const chats = ["New conversation", "Project planning", "Content ideas", "Code & development"];

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
  const [proposal, setProposal] = useState<CommandProposal | null>(null);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeName, setYoutubeName] = useState("");
  const [youtubeFile, setYoutubeFile] = useState<File | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [youtubeUploadBusy, setYoutubeUploadBusy] = useState(false);
  const [youtubeUploadMessage, setYoutubeUploadMessage] = useState("");
  const [socialConnections, setSocialConnections] = useState<Record<string, any>>({});
  const [socialBusy, setSocialBusy] = useState(false);
  const [activeView, setActiveView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [enabledPlugins, setEnabledPlugins] = useState<Record<string, boolean>>({
    YouTube: true, "Web tools": true, Calendar: false, Gmail: false, "Facebook / Instagram": false, TikTok: false
  });
  const recognitionRef = useRef<any>(null);
  const continuousRef = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/social/connections", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSocialConnections(data); })
      .catch(() => undefined);
    void fetch("/api/youtube/status", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.connected) {
          setYoutubeConnected(true);
          setYoutubeName(data.account?.name || "YouTube connected");
        }
      }).catch(() => undefined);
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

  useEffect(() => { continuousRef.current = continuous; }, [continuous]);
  useEffect(() => () => {
    continuousRef.current = false;
    recognitionRef.current?.abort?.();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  function speak(text: string) {
    if (!speechSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#\`]/g, ""));
    u.lang = voiceLang;
    window.speechSynthesis.speak(u);
  }

  async function send(text = input, fromVoice = false) {
    const value = text.trim();
    if (!value || busy) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next); setInput(""); setHeard(fromVoice ? value : ""); setBusy(true);
    try {
      const res = await fetch("/api/openai", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
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
    } finally { setBusy(false); }
  }

  async function uploadYoutubeVideo(e: FormEvent) {
    e.preventDefault();
    if (!youtubeFile || !youtubeTitle.trim() || youtubeUploadBusy) return;
    if (youtubeFile.size > 4 * 1024 * 1024) { setYoutubeUploadMessage("সর্বোচ্চ 4 MB ফাইল নেওয়া যায়।"); return; }
    setYoutubeUploadBusy(true); setYoutubeUploadMessage("YouTube-এ private upload চলছে…");
    try {
      const form = new FormData();
      form.append("video", youtubeFile); form.append("title", youtubeTitle.trim()); form.append("privacyStatus", "private");
      const response = await fetch("/api/youtube/upload", { method: "POST", body: form, credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "YouTube upload failed.");
      setYoutubeUploadMessage(`Upload verified: ${data.video?.id || "video ID unavailable"} (private)`);
      setYoutubeFile(null); setYoutubeTitle("");
    } catch (error) { setYoutubeUploadMessage(error instanceof Error ? error.message : "YouTube upload failed."); }
    finally { setYoutubeUploadBusy(false); }
  }

  function stopVoice() {
    continuousRef.current = false; setContinuous(false); recognitionRef.current?.stop?.(); setListening(false);
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceSupported(false); return; }
    continuousRef.current = continuous;
    const r = new SpeechRecognition();
    recognitionRef.current = r; r.lang = voiceLang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onstart = () => { setListening(true); setHeard(""); };
    r.onresult = (e: any) => {
      let finalText = "", interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal) finalText += transcript; else interimText += transcript;
      }
      const transcript = (finalText || interimText).trim(); setHeard(transcript);
      if (finalText.trim()) {
        const confidence = e.results[e.resultIndex]?.[0]?.confidence;
        const verification = verifyVoiceTranscript(transcript, typeof confidence === "number" ? confidence : null);
        if (!verification.accepted) { setVoiceNotice("কথাটি পরিষ্কারভাবে বোঝা যায়নি—আবার বলো।"); return; }
        const intent = classifyVoiceIntent(transcript, typeof confidence === "number" ? confidence : null);
        if (intent.type === "automation_request") {
          setVoiceNotice("এটি consequential action। আগে proposed action দেখানো হবে।");
          void (async () => {
            try {
              const response = await fetch("/api/command", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, confidence }),
              });
              const data = await response.json();
              if (data.proposal) setProposal(data.proposal as CommandProposal); else setVoiceNotice(data.error || "Command proposal তৈরি করা যায়নি।");
            } catch { setVoiceNotice("Command proposal service-এ সংযোগ করা যাচ্ছে না।"); }
          })();
          return;
        }
        setVoiceNotice("Voice command গ্রহণ করা হয়েছে।"); setInput(transcript); void send(transcript, true);
      }
    };
    r.onerror = (e: any) => { setListening(false); if (e?.error !== "aborted") setHeard("Voice recognition error — আবার চেষ্টা করো।"); };
    r.onend = () => {
      setListening(false); recognitionRef.current = null;
      if (continuousRef.current) window.setTimeout(() => { if (continuousRef.current && !busy) startVoice(); }, 350);
    };
    r.start();
  }

  function clear() {
    setMessages([{ role: "assistant", content: "নতুন conversation শুরু হয়েছে। কী করতে হবে বলো।" }]);
    setInput(""); setHeard(""); setVoiceNotice(""); setProposal(null); localStorage.removeItem("sam-chat");
    setActiveView("chat"); setSidebarOpen(false);
  }

  function go(view: View) { setActiveView(view); setSidebarOpen(false); }

  function panel() {
    if (activeView === "chat") return null;
    if (activeView === "projects") return <div className="sam-panel"><h2>Projects</h2><p>তোমার কাজগুলো project অনুযায়ী সাজাও।</p><div className="sam-empty">No projects yet. শুরু করতে Chat-এ project তৈরি করতে বলো।</div></div>;
    if (activeView === "tasks") return <div className="sam-panel"><h2>Tasks & automation</h2><p>Scheduled work, automation এবং approval-gated actions এখানে থাকবে।</p><div className="sam-empty">Automation control center ready for connected integrations.</div></div>;
    if (activeView === "library") return <div className="sam-panel"><h2>Library</h2><p>Saved conversations, files এবং generated assets-এর জায়গা।</p><div className="sam-empty">Your saved library will appear here.</div></div>;
    if (activeView === "plugins") {
      const social = [
        { key: "youtube", name: "YouTube", icon: "▶", href: "/api/oauth/youtube", desc: "Google account দিয়ে YouTube channel connect" },
        { key: "meta", name: "Facebook / Instagram", icon: "f", href: "/api/oauth/meta", desc: "Meta account ও অনুমোদিত Pages/Instagram access" },
        { key: "tiktok", name: "TikTok", icon: "♪", href: "/api/oauth/tiktok", desc: "TikTok account ও approved API scopes" },
      ];
      return <div className="sam-panel"><h2>Apps & social connections</h2><p>এখানে Enable/Disable নয়—প্রতিটি service-এ ঢুকে তার নিজস্ব login/consent screen থেকে account connect করবে। এরপর SAM শুধু অনুমোদিত permission-ই ব্যবহার করবে।</p>
        <div className="sam-connection-list">
          {social.map((item) => {
            const connection = socialConnections[item.key];
            const connected = Boolean(connection?.connected);
            const scopes = connection?.account?.scopes || [];
            return <div className="sam-connection-card" key={item.key}>
              <div className="sam-connection-main"><div className="sam-service-icon">{item.icon}</div><div><b>{item.name}</b><small>{connected ? (connection.account.name || "Connected account") : item.desc}</small></div></div>
              <div className="sam-connection-actions">
                {connected ? <><span className="sam-connected">Connected</span><button type="button" onClick={() => alert("Disconnect is handled through the provider authorization settings or SAM account security controls.")}>Manage</button></> : <a className="sam-connect" href={item.href}>Connect</a>}
              </div>
              {connected && <details className="sam-permissions"><summary>Granted permissions ({scopes.length})</summary><div>{scopes.map((scope: string) => <span key={scope}>{scope}</span>)}</div></details>}
            </div>;
          })}
        </div>
        <div className="sam-empty">Permission principle: request the smallest useful scope, show the granted scopes, keep tokens encrypted server-side, and require re-authorization when a provider token expires or is revoked.</div>
      </div>;
    }
    if (activeView === "device") return <div className="sam-panel"><h2>Device access</h2><p>Browser permission-এর মাধ্যমে SAM microphone, camera এবং screen sharing ব্যবহার করতে পারে। OS-level permission সবসময় তোমাকেই অনুমতি দিতে হবে।</p><div className="sam-access-grid">
      <button onClick={async () => { try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {} }}>🎙 Microphone</button>
      <button onClick={async () => { try { await navigator.mediaDevices.getUserMedia({ video: true }); } catch {} }}>📷 Camera</button>
      <button onClick={async () => { try { await (navigator.mediaDevices as any).getDisplayMedia({ video: true }); } catch {} }}>🖥 Screen share</button>
    </div><div className="sam-empty">Full device control is not granted by a webpage; native Android/PC permissions remain explicit.</div></div>;
    return <div className="sam-panel"><h2>Settings</h2><p>Voice language, connected services এবং workspace preferences.</p><div className="sam-setting-row"><span>Voice language</span><select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>{VOICE_LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div></div>;
  }

  return (
    <main className="sam-app">
      <div className={sidebarOpen ? "sam-backdrop open" : "sam-backdrop"} onClick={() => setSidebarOpen(false)} />
      <aside className={sidebarOpen ? "sam-side open" : "sam-side"}>
        <div className="sam-side-top">
          <div className="sam-brand"><div className="sam-mark">S</div><div><b>SAM</b><small>PRIVATE AI</small></div><button className="sam-collapse" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">×</button></div>
          <button className="sam-new" onClick={clear}><span>✦</span> New chat <kbd>Ctrl K</kbd></button>
          <button className="sam-search" onClick={() => setSearchOpen((v) => !v)}>⌕ <span>Search chats</span><kbd>Ctrl K</kbd></button>
        </div>
        {searchOpen && <div className="sam-search-box"><input autoFocus placeholder="Search conversations…" /></div>}
        <div className="sam-section-title">Chats</div>
        <div className="sam-history">
          {chats.map((chat, i) => <button key={chat} className={i === 0 && activeView === "chat" ? "active" : ""} onClick={() => go("chat")}><span>◌</span>{chat}</button>)}
        </div>
        <div className="sam-section-title sam-section-gap">Workspace</div>
        <nav className="sam-nav">
          <button className={activeView === "projects" ? "selected" : ""} onClick={() => go("projects")}>▣ <span>Projects</span></button>
          <button className={activeView === "tasks" ? "selected" : ""} onClick={() => go("tasks")}>◷ <span>Tasks & automation</span></button>
          <button className={activeView === "library" ? "selected" : ""} onClick={() => go("library")}>▱ <span>Library</span></button>
          <button className={activeView === "plugins" ? "selected" : ""} onClick={() => go("plugins")}>⊞ <span>Apps & plugins</span></button>
          <button className={activeView === "device" ? "selected" : ""} onClick={() => go("device")}>⌁ <span>Device access</span></button>
        </nav>
        <div className="sam-footer">
          <button className={activeView === "settings" ? "sam-account selected" : "sam-account"} onClick={() => go("settings")}><div className="sam-user-avatar">S</div><div><b>Private workspace</b><small>{youtubeConnected ? youtubeName : "SAM AI"}</small></div><span>•••</span></button>
        </div>
      </aside>

      <section className="sam-main">
        <header className="sam-header">
          <button className="sam-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">☰</button>
          <div className="sam-header-title"><b>{activeView === "chat" ? "SAM" : activeView === "plugins" ? "Apps & plugins" : activeView[0].toUpperCase() + activeView.slice(1)}</b><small>{activeView === "chat" ? "Private AI assistant" : "SAM workspace"}</small></div>
          <div className="sam-header-actions">
            <button type="button" onClick={() => go("plugins")}>{Object.values(socialConnections).filter((v:any) => v?.connected).length ? "Connected apps ✓" : "Connect apps"}</button>
            <select aria-label="Voice language" value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>{VOICE_LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
            <button onClick={clear}>New</button>
          </div>
        </header>

        {panel()}
        <div className={activeView === "chat" ? "sam-chat" : "sam-chat sam-chat-hidden"}>
          <div className="sam-welcome"><div className="sam-orb">S</div><div className="sam-kicker">PRIVATE AI ASSISTANT</div><h1>What can I help you build?</h1><p>Speak naturally. SAM listens, reasons, and reports what it actually did.</p></div>
          <div className="sam-messages">
            {messages.map((m, i) => <div className={"sam-msg " + m.role} key={i}><div className="sam-avatar">{m.role === "assistant" ? "S" : "You"}</div><div className="sam-bubble">{m.content}</div></div>)}
            {busy && <div className="sam-msg assistant"><div className="sam-avatar">S</div><div className="sam-bubble sam-typing">● ● ●</div></div>}
            <div ref={end} />
          </div>
          {messages.length === 1 && <div className="sam-starters">{starters.map((s) => <button key={s} onClick={() => send(s)}>✦ {s}</button>)}</div>}
          {voiceNotice && <div className="sam-note" aria-live="polite">{voiceNotice}</div>}
          {proposal && <div className="sam-note" role="status"><b>Proposed action:</b> {proposal.action || proposal.intent}<br/><span>{proposal.reason}</span><br/><small>Approval required: {proposal.requiresApproval ? "Yes" : "No"} · Execution: not performed</small><div style={{marginTop:8}}><button type="button" onClick={() => {setInput(proposal.transcript);setProposal(null);}}>Review in message box</button><button type="button" onClick={() => setProposal(null)} style={{marginLeft:8}}>Dismiss</button></div></div>}
          {heard && <div className="sam-voice-preview" aria-live="polite"><b>{listening ? "SAM is hearing:" : "SAM heard:"}</b> {heard}</div>}
          {!voiceSupported && <div className="sam-note">এই browser-এ voice recognition নেই। Chrome/Android-এর supported browser ব্যবহার করো।</div>}
          <form className="sam-compose" onSubmit={(e: FormEvent) => { e.preventDefault(); send(); }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message SAM…" rows={1} aria-label="Message"/>
            <button type="button" className={listening ? "voice active" : "voice"} onClick={() => listening ? stopVoice() : startVoice()} disabled={!voiceSupported} aria-label="Voice">{listening ? "■" : "◉"}</button>
            <button type="button" className={continuous ? "voice active" : "voice"} onClick={() => setContinuous((v) => !v)} disabled={!voiceSupported} aria-label="Continuous voice">∞</button>
            <button className="sam-send" disabled={!input.trim() || busy}>➤</button>
          </form>
          <div className="sam-note">Voice commands are transcribed before processing. Consequential external actions remain approval-gated.</div>
        </div>
      </section>
    </main>
  );
}
