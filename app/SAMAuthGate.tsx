"use client";

import { FormEvent, useEffect, useState } from "react";
import SAMWorkspace from "./SAMWorkspace";

export default function SAMAuthGate() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkSession() {
    try { const r = await fetch("/api/auth/session", { cache: "no-store" }); setAuthenticated(r.ok); }
    catch { setAuthenticated(false); }
  }
  useEffect(() => { void checkSession(); }, []);

  async function login(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Login failed.");
      setAuthenticated(true); setPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed."); }
    finally { setBusy(false); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); setAuthenticated(false); }

  if (authenticated === null) return <main className="sam-auth"><div className="sam-auth-card"><div className="sam-mark">S</div><h1>Loading SAM…</h1></div></main>;
  if (authenticated) return <div><button type="button" onClick={logout} style={{ position: "fixed", top: 14, right: 14, zIndex: 50 }}>Sign out</button><SAMWorkspace /></div>;

  return <main className="sam-auth"><div className="sam-auth-card"><div className="sam-mark">S</div><div className="sam-kicker">PRIVATE AI ASSISTANT</div><h1>Sign in to SAM</h1><p>Your private SAM workspace requires an authenticated session.</p><form onSubmit={login}><input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required /><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>{error && <div className="sam-note" role="alert">{error}</div>}<small>Authentication is handled by the dedicated SAM Supabase project. Passwords are not stored by SAM.</small></div></main>;
}
