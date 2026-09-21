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

/**
 * Durable audit writes belong behind the SAM database adapter.
 * Keeping this boundary explicit prevents accidental in-memory-only
 * audit records from being presented as production persistence.
 */
export interface AuditStore {
  append(event: AuditEvent): Promise<void>;
}
