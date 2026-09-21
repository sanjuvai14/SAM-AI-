import type { AutomationJob } from "./automation";
import type { JobRepository } from "./job-repository";

type SupabaseConfig = {
  url: string;
  accessToken: string;
};

function config(): SupabaseConfig {
  const url = process.env.SAM_SUPABASE_URL;
  const accessToken = process.env.SAM_SUPABASE_ACCESS_TOKEN;

  if (!url || !accessToken) {
    throw new Error(
      "SAM persistent database access is not configured. Protected job operation denied."
    );
  }

  return { url: url.replace(/\/$/, ""), accessToken };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, accessToken } = config();
  const response = await fetch(url + path, {
    ...init,
    headers: {
      apikey: accessToken,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SAM database request failed: HTTP ${response.status}`);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function rowToJob(row: Record<string, unknown>): AutomationJob {
  return {
    id: String(row.id),
    action: row.action as AutomationJob["action"],
    title: String(row.title),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status as AutomationJob["status"],
    createdAt: String(row.created_at),
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    error: row.error ? String(row.error) : undefined,
  };
}

export class SupabaseJobRepository implements JobRepository {
  async create(job: AutomationJob, userId: string): Promise<void> {
    await request("/rest/v1/sam_jobs", {
      method: "POST",
      body: JSON.stringify({
        id: job.id,
        user_id: userId,
        action: job.action,
        title: job.title,
        payload: job.payload,
        status: job.status,
        created_at: job.createdAt,
        verified_at: job.verifiedAt ?? null,
        error: job.error ?? null,
      }),
    });
  }

  async get(id: string, userId: string): Promise<AutomationJob | null> {
    const rows = await request<Record<string, unknown>[]>(
      `/rest/v1/sam_jobs?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`
    );
    return rows[0] ? rowToJob(rows[0]) : null;
  }

  async list(userId: string): Promise<AutomationJob[]> {
    const rows = await request<Record<string, unknown>[]>(
      `/rest/v1/sam_jobs?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
    );
    return rows.map(rowToJob);
  }

  async transition(
    id: string,
    userId: string,
    status: AutomationJob["status"],
    error?: string
  ): Promise<AutomationJob> {
    const current = await this.get(id, userId);
    if (!current) {
      throw new Error("SAM job not found or not owned by authenticated user.");
    }

    const allowed: Record<AutomationJob["status"], AutomationJob["status"][]> = {
      queued: ["awaiting_approval", "failed"],
      awaiting_approval: ["queued", "failed"],
      running: ["succeeded", "failed"],
      succeeded: [],
      failed: [],
    };

    if (!allowed[current.status].includes(status)) {
      throw new Error(
        `Invalid SAM job transition: ${current.status} -> ${status}`
      );
    }

    const body: Record<string, unknown> = {
      status,
      error: error ?? null,
    };

    if (status === "queued") body.approved_at = new Date().toISOString();
    if (status === "succeeded") body.verified_at = new Date().toISOString();

    const rows = await request<Record<string, unknown>[]>(
      `/rest/v1/sam_jobs?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    if (!rows[0]) {
      throw new Error("SAM job transition did not update an owned job.");
    }

    return rowToJob(rows[0]);
  }
}
