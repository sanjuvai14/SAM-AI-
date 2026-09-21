import type { AutomationJob } from "./automation";

export type WorkerExecutionResult =
  | { status: "succeeded"; verification: "verified"; note: string }
  | { status: "failed"; verification: "failed"; note: string }
  | { status: "blocked"; verification: "blocked"; note: string };

/**
 * Queue-worker boundary for SAM.
 *
 * This intentionally does not call YouTube, Meta, TikTok, or any other
 * external platform. Until an official API adapter is configured and its
 * result can be independently verified, a queued job must fail closed.
 */
export async function executeQueuedJob(
  job: AutomationJob
): Promise<WorkerExecutionResult> {
  if (job.status !== "queued") {
    return {
      status: "blocked",
      verification: "blocked",
      note: "Only approved queued jobs may enter the worker.",
    };
  }

  return {
    status: "blocked",
    verification: "blocked",
    note: "No verified external execution adapter is configured. SAM did not perform an external action.",
  };
}
