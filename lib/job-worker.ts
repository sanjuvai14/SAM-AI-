import type { AuditStore } from "./audit";
import { AUDIT_EVENT_TYPES } from "./audit";
import type { JobRepository } from "./job-repository";
import type { AutomationJob } from "./automation";

export type WorkerExecutionResult =
  | { status: "succeeded"; verification: "verified"; note: string }
  | { status: "failed"; verification: "failed"; note: string }
  | { status: "blocked"; verification: "blocked"; note: string };

export async function executeQueuedJob(job: AutomationJob): Promise<WorkerExecutionResult> {
  if (job.status !== "queued") return { status: "blocked", verification: "blocked", note: "Only approved queued jobs may enter the worker." };
  return { status: "blocked", verification: "blocked", note: "No verified external execution adapter is configured. SAM did not perform an external action." };
}

export async function processQueuedJob(
  job: AutomationJob,
  userId: string,
  jobs: JobRepository,
  audit: AuditStore,
): Promise<AutomationJob> {
  const running = await jobs.transition(job.id, userId, "running", undefined, "queued");
  await audit.append({ id: crypto.randomUUID(), userId, jobId: job.id, eventType: AUDIT_EVENT_TYPES.JOB_RUNNING, action: job.action, verificationStatus: "not_executed", metadata: {}, createdAt: new Date().toISOString() });

  const result = await executeQueuedJob(running);
  const finalStatus = result.status === "succeeded" ? "succeeded" : "failed";
  const completed = await jobs.transition(job.id, userId, finalStatus, result.status === "failed" || result.status === "blocked" ? result.note : undefined, "running");
  await audit.append({
    id: crypto.randomUUID(), userId, jobId: job.id,
    eventType: result.status === "succeeded" ? AUDIT_EVENT_TYPES.JOB_SUCCEEDED : (result.status === "blocked" ? AUDIT_EVENT_TYPES.JOB_BLOCKED : AUDIT_EVENT_TYPES.JOB_FAILED),
    action: job.action, verificationStatus: result.verification,
    metadata: { note: result.note, finalStatus }, createdAt: new Date().toISOString(),
  });
  return completed;
}
