import type { AutomationJob } from "./automation";

export interface JobRepository {
  create(job: AutomationJob, userId: string): Promise<void>;
  get(id: string, userId: string): Promise<AutomationJob | null>;
  list(userId: string): Promise<AutomationJob[]>;
  transition(
    id: string,
    userId: string,
    status: AutomationJob["status"],
    error?: string,
    expectedStatus?: AutomationJob["status"]
  ): Promise<AutomationJob>;
}

/**
 * Production code must inject a database-backed implementation.
 * There is intentionally no anonymous fallback here.
 */
export function requireJobRepository(): JobRepository {
  throw new Error(
    "SAM persistent job repository is not configured. Operation denied."
  );
}
