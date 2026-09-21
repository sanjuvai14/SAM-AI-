export type CommandRisk = "safe" | "consequential";
export type CommandIntent =
  | "chat"
  | "youtube.upload"
  | "youtube.seo"
  | "facebook.video"
  | "instagram.video"
  | "tiktok.video"
  | "unknown";

export type CommandProposal = {
  intent: CommandIntent;
  risk: CommandRisk;
  transcript: string;
  action?: string;
  requiresApproval: boolean;
  reason: string;
};

const patterns: Array<{ intent: Exclude<CommandIntent, "chat" | "unknown">; hints: string[] }> = [
  { intent: "youtube.upload", hints: ["youtube", "ইউটিউব", "यूट्यूब", "upload", "আপলোড", "अपलोड"] },
  { intent: "youtube.seo", hints: ["youtube seo", "ইউটিউব seo", "title tags", "টাইটেল ট্যাগ"] },
  { intent: "facebook.video", hints: ["facebook", "ফেসবুক", "फेसबुक"] },
  { intent: "instagram.video", hints: ["instagram", "ইনস্টাগ্রাম", "इंस्टाग्राम"] },
  { intent: "tiktok.video", hints: ["tiktok", "টিকটক", "टिकटॉक"] },
];

const consequential = ["upload", "post", "publish", "schedule", "delete", "আপলোড", "পোস্ট", "পাবলিশ", "শিডিউল", "ডিলিট", "अपलोड", "पोस्ट", "पब्लिश", "शेड्यूल", "डिलीट"];

export function buildCommandProposal(transcript: string, confidence: number | null = null): CommandProposal {
  const value = transcript.trim();
  if (!value) return { intent: "unknown", risk: "safe", transcript: "", requiresApproval: false, reason: "Empty command." };
  if (confidence !== null && confidence < 0.55) {
    return { intent: "unknown", risk: "safe", transcript: value, requiresApproval: false, reason: "Voice confidence is below SAM's acceptance threshold." };
  }

  const lower = value.toLocaleLowerCase();
  const match = patterns
    .filter((p) => p.hints.some((h) => lower.includes(h.toLocaleLowerCase())))
    .sort((a, b) => b.hints.length - a.hints.length)[0];

  if (!match) {
    const risky = consequential.some((h) => lower.includes(h));
    return {
      intent: risky ? "unknown" : "chat",
      risk: risky ? "consequential" : "safe",
      transcript: value,
      requiresApproval: risky,
      reason: risky
        ? "This sounds like an external action, but SAM could not safely identify the exact supported action."
        : "No external action was requested.",
    };
  }

  return {
    intent: match.intent,
    risk: "consequential",
    transcript: value,
    action: match.intent,
    requiresApproval: true,
    reason: "External platform action detected. SAM must show the exact proposal and receive explicit approval before any execution.",
  };
}
