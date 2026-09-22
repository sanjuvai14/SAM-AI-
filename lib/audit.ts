export type AuditVerificationStatus =
  | "not_executed"
  | "verified"
  | "failed"
  | "blocked";

export type AuditEvent = {
  id: string;
  userId: string;
  jobId?: string;
  eventType: string;
  action?: string;
  verificationStatus: AuditVerificationStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
}

export const AUDIT_EVENT_TYPES = {
  JOB_CREATED: "job.created",
  JOB_QUEUED: "job.queued",
  JOB_RUNNING: "job.running",
  JOB_SUCCEEDED: "job.succeeded",
  JOB_FAILED: "job.failed",
  JOB_BLOCKED: "job.blocked",
  JOB_REJECTED: "job.rejected",
} as const;
