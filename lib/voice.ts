export type VoiceLanguage = "bn-BD" | "en-US" | "hi-IN";

export type VoiceIntent =
  | { type: "chat"; transcript: string; confidence: number | null }
  | { type: "automation_request"; transcript: string; confidence: number | null }
  | { type: "unknown"; transcript: string; confidence: number | null };

export type VoiceVerification = {
  accepted: boolean;
  reason: "clear" | "empty" | "low_confidence";
};

const AUTOMATION_HINTS = [
  "upload", "post", "publish", "schedule", "delete",
  "আপলোড", "পোস্ট", "পাবলিশ", "শিডিউল", "ডিলিট",
  "अपलोड", "पोस्ट", "पब्लिश", "शेड्यूल", "डिलीट",
];

export function classifyVoiceIntent(transcript: string, confidence: number | null): VoiceIntent {
  const value = transcript.trim();
  if (!value) return { type: "unknown", transcript: "", confidence };
  if (confidence !== null && confidence < 0.55) {
    return { type: "unknown", transcript: value, confidence };
  }
  const lower = value.toLocaleLowerCase();
  const isAutomation = AUTOMATION_HINTS.some((hint) => lower.includes(hint.toLocaleLowerCase()));
  return {
    type: isAutomation ? "automation_request" : "chat",
    transcript: value,
    confidence,
  };
}

export function verifyVoiceTranscript(transcript: string, confidence: number | null): VoiceVerification {
  const value = transcript.trim();
  if (!value) return { accepted: false, reason: "empty" };
  if (confidence !== null && confidence < 0.55) return { accepted: false, reason: "low_confidence" };
  return { accepted: true, reason: "clear" };
}
