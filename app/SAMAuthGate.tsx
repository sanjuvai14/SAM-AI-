"use client";

import { FormEvent, useEffect, useState } from "react";
import SAMWorkspace from "./SAMWorkspace";

export default function SAMAuthGate() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function checkSession() {
    try { const r = await fetch("/api/auth/session", { cache: "no-store" }); setAuthenticated(r.ok); }
    catch { setAuthenticated(false); }
  }
  useEffect(() => { void checkSession(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || (mode === "login" ? "Login failed." : "Account creation failed."));
      setPassword("");
      if (mode === "signup" && data.needsEmailConfirmation) {
        setNotice("Account created. Check your email to confirm it, then sign in.");
        setMode("login");
        return;
      }
      setAuthenticated(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); setAuthenticated(false); }

  if (authenticated === null) return <main className="sam-auth"><div className="sam-auth-card"><div className="sam-mark">S</div><h1>Loading SAM…</h1></div></main>;
  if (authenticated) return <div><button type="button" onClick={logout} style={{ position: "fixed", top: 14, right: 14, zIndex: 50 }}>Sign out</button><SAMWorkspace /></div>;

  return <main className="sam-auth"><div className="sam-auth-card"><div className="sam-mark">S</div><div className="sam-kicker">PRIVATE AI ASSISTANT</div><h1>{mode === "login" ? "Sign in to SAM" : "Create your SAM account"}</h1><p>{mode === "login" ? "Your private SAM workspace requires an authenticated session." : "Create your private SAM account with your own email and password."}</p><form onSubmit={submit}><input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password (8+ characters)" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /><button disabled={busy}>{busy ? (mode === "login" ? "Signing in…" : "Creating account…") : (mode === "login" ? "Sign in" : "Create account")}</button></form>{error && <div className="sam-note" role="alert">{error}</div>}{notice && <div className="sam-note" role="status">{notice}</div>}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }} style={{ marginTop: 12 }}>{mode === "login" ? "Create a new SAM account" : "Already have an account? Sign in"}</button><small>Authentication is handled by the dedicated SAM Supabase project. Passwords are not stored by SAM.</small></div></main>;
}
