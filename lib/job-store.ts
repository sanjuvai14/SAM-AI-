import type { AutomationJob } from "@/lib/automation";

const jobs = new Map<string, AutomationJob>();

export function saveJob(job: AutomationJob) {
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string) {
  return jobs.get(id) ?? null;
}

export function listJobs() {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function transitionJob(id: string, next: AutomationJob["status"], error?: string) {
  const job = jobs.get(id);
  if (!job) return null;

  const allowed: Record<AutomationJob["status"], AutomationJob["status"][]> = {
    queued: ["awaiting_approval", "failed"],
    awaiting_approval: ["queued", "failed"],
    running: ["succeeded", "failed"],
    succeeded: [],
    failed: [],
  };

  if (!allowed[job.status].includes(next)) return null;
  const updated: AutomationJob = {
    ...job,
    status: next,
    ...(error ? { error } : {}),
    ...(next === "succeeded" ? { verifiedAt: new Date().toISOString() } : {}),
  };
  jobs.set(id, updated);
  return updated;
}
