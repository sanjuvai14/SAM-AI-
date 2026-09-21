"use client";

import { useEffect, useMemo, useState } from "react";

type Message = { role: "user" | "assistant"; content: string; time: string };
const starter: Message[] = [{ role:"assistant", content:"হ্যালো! আমি SAM। বাংলা, English বা Hindi—যে ভাষায় লিখবে, আমি সেই ভাষাতেই উত্তর দেওয়ার চেষ্টা করব। এখনই chat, notes, quick tools এবং browser voice input ব্যবহার করতে পারো।", time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) }];
const quickPrompts = [["✍️ লেখালেখি","এই বিষয়টি পরিষ্কার ও পেশাদারভাবে লিখে দাও: "],["📋 পরিকল্পনা","এই কাজের জন্য ধাপে ধাপে একটি বাস্তব পরিকল্পনা তৈরি করো: "],["🧠 বিশ্লেষণ","এই বিষয়টি বিশ্লেষণ করে সুবিধা, ঝুঁকি ও পরবর্তী পদক্ষেপ বলো: "],["🌐 অনুবাদ","নিচের লেখাটি সহজ English-এ অনুবাদ করো: "]];

export default function Home(){
 const [messages,setMessages]=useState<Message[]>(starter),[input,setInput]=useState(""),[busy,setBusy]=useState(false),[voice,setVoice]=useState(false);
 useEffect(()=>{const s=localStorage.getItem("sam-chat");if(s)setMessages(JSON.parse(s));},[]);
 useEffect(()=>{localStorage.setItem("sam-chat",JSON.stringify(messages));},[messages]);
 const canSend=useMemo(()=>input.trim().length>0&&!busy,[input,busy]);
 async function send(text=input){
  const value=text.trim();if(!value||busy)return;const now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});setInput("");setMessages(m=>[...m,{role:"user",content:value,time:now}]);setBusy(true);
  try{const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[...messages,{role:"user",content:value}].slice(-20)})});const data=await res.json();setMessages(m=>[...m,{role:"assistant",content:data?.reply||"SAM-এর AI provider এখন সংযুক্ত নেই। পরে API credential যোগ করলে live AI চালু হবে।",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);}
  catch{setMessages(m=>[...m,{role:"assistant",content:"এই মুহূর্তে AI service পাওয়া যাচ্ছে না। Local chat history ঠিক আছে—পরে provider যুক্ত করলে এখান থেকেই চালু হবে।",time:now}]);}finally{setBusy(false);}
 }
 function startVoice(){
  const SR=(window as unknown as {SpeechRecognition?:new()=>{lang:string;start:()=>void;onresult:(e:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void;onend:()=>void}}).SpeechRecognition;
  if(!SR){alert("এই browser-এ voice input support নেই। Chrome/Edge-এ চেষ্টা করো।");return;}
  const r=new SR();r.lang="bn-BD";setVoice(true);r.onresult=e=>setInput(e.results[0][0].transcript);r.onend=()=>setVoice(false);r.start();
 }
 function clearChat(){setMessages(starter);localStorage.removeItem("sam-chat");}
 return <main className="app">
  <aside className="sidebar"><div className="brand"><div className="logo">S</div><div><b>SAM</b><span>PRIVATE AI</span></div></div>
   <button className="new-chat" onClick={clearChat}>＋ New chat</button><div className="side-title">QUICK TOOLS</div>
   {quickPrompts.map(([label,prompt])=><button className="tool" key={label} onClick={()=>setInput(prompt)}>{label}</button>)}
   <div className="side-bottom"><div className="secure">● Local history enabled</div><small>External services stay disconnected until you configure them.</small></div>
  </aside>
  <section className="workspace"><header className="topbar"><div><strong>SAM Workspace</strong><span className="online">● Ready</span></div><button className="clear" onClick={clearChat}>Clear chat</button></header>
   <div className="messages">{messages.map((m,i)=><div className={`row ${m.role}`} key={i}><div className="avatar">{m.role==="assistant"?"S":"You"}</div><div className="bubble"><div className="message-text">{m.content}</div><time>{m.time}</time></div></div>)}{busy&&<div className="row assistant"><div className="avatar">S</div><div className="bubble typing">SAM is thinking…</div></div>}</div>
   <div className="composer-wrap"><div className="composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Message SAM…" rows={1}/><button className={`mic ${voice?"active":""}`} onClick={startVoice} aria-label="Voice input">🎙</button><button className="send" disabled={!canSend} onClick={()=>send()}>➤</button></div><p>Enter to send · Shift+Enter for a new line · Voice input works when supported by your browser</p></div>
  </section>
 </main>;
}