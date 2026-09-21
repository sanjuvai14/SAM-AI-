export type AutomationAction =
  | "youtube.upload"
  | "youtube.seo"
  | "facebook.video"
  | "instagram.video"
  | "tiktok.video";

export type AutomationJob = {
  id: string;
  action: AutomationAction;
  title: string;
  payload: Record<string, unknown>;
  status: "queued" | "awaiting_approval" | "running" | "succeeded" | "failed";
  createdAt: string;
  verifiedAt?: string;
  error?: string;
};

export const ACTIONS: Record<AutomationAction, { externalApi: string; requiresApproval: boolean }> = {
  "youtube.upload": { externalApi: "YouTube Data API", requiresApproval: true },
  "youtube.seo": { externalApi: "YouTube Data API", requiresApproval: true },
  "facebook.video": { externalApi: "Meta Graph API", requiresApproval: true },
  "instagram.video": { externalApi: "Meta Graph API", requiresApproval: true },
  "tiktok.video": { externalApi: "TikTok Content Posting API", requiresApproval: true },
};

export function createAutomation(input: Omit<AutomationJob, "id" | "status" | "createdAt">): AutomationJob {
  return {
    ...input,
    id: crypto.randomUUID(),
    status: "awaiting_approval",
    createdAt: new Date().toISOString(),
  };
}
