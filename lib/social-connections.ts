import { requireEnv } from "./social-oauth";

type Connection = {
  id: string;
  user_id: string;
  platform: "youtube" | "meta" | "tiktok";
  external_account_id: string | null;
  account_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
};

function endpoint(path: string) {
  return requireEnv("SAM_SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path;
}

function headers() {
  return {
    apikey: requireEnv("SAM_SUPABASE_ACCESS_TOKEN"),
    Authorization: "Bearer " + requireEnv("SAM_SUPABASE_ACCESS_TOKEN"),
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

export async function saveSocialConnection(input: Omit<Connection, "id" | "created_at" | "updated_at">) {
  const response = await fetch(endpoint("sam_social_connections?on_conflict=user_id,platform"), {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(input)
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error("Failed to persist social connection.");
  return data[0] as Connection;
}

export async function getSocialConnection(userId: string, platform: Connection["platform"]) {
  const params = new URLSearchParams({ user_id: "eq." + userId, platform: "eq." + platform, select: "*" });
  const response = await fetch(endpoint("sam_social_connections?" + params.toString()), { headers: headers(), cache: "no-store" });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error("Failed to load social connection.");
  return (data[0] || null) as Connection | null;
}
