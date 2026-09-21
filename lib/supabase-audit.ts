import type { AuditEvent, AuditStore } from "./audit";

export class SupabaseAuditStore implements AuditStore {
  async append(event: AuditEvent): Promise<void> {
    const url = process.env.SAM_SUPABASE_URL;
    const accessToken = process.env.SAM_SUPABASE_ACCESS_TOKEN;
    if (!url || !accessToken) {
      throw new Error("SAM audit persistence is not configured.");
    }

    const response = await fetch(
      `${url.replace(/\\/$/, "")}/rest/v1/sam_audit_events`,
      {
        method: "POST",
        headers: {
          apikey: accessToken,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          id: event.id,
          user_id: event.userId,
          job_id: event.jobId ?? null,
          event_type: event.eventType,
          action: event.action ?? null,
          verification_status: event.verificationStatus,
          metadata: event.metadata,
          created_at: event.createdAt,
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`SAM audit write failed: HTTP ${response.status}`);
    }
  }
}
