import { decryptSecret, encryptSecret } from "./crypto";

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

function supabaseUrl() {
  return process.env.SAM_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function serviceToken() {
  return process.env.SAM_SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function endpoint(path: string) {
  const url = supabaseUrl();
  if (!url) throw new Error("SAM Supabase URL is missing.");
  return url.replace(/\/$/, "") + "/rest/v1/" + path;
}

function headers() {
  const token = serviceToken();
  if (!token) throw new Error("SAM Supabase service token is missing.");
  return {
    apikey: token,
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

export async function saveSocialConnection(input: Omit<Connection, "id" | "created_at" | "updated_at">) {
  const credential = encryptSecret(JSON.stringify({ access_token: input.access_token, refresh_token: input.refresh_token }));
  const response = await fetch(endpoint("sam_social_connections?on_conflict=user_id,platform"), {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: input.user_id,
      platform: input.platform,
      external_account_id: input.external_account_id,
      account_name: input.account_name,
      access_token: null,
      refresh_token: null,
      access_token_ciphertext: credential.ciphertext,
      refresh_token_ciphertext: null,
      token_iv: credential.iv,
      token_tag: credential.tag,
      credential_version: 1,
      expires_at: input.expires_at,
      scopes: input.scopes,
      metadata: input.metadata
    })
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
  const row = data[0];
  if (!row) return null;

  if (row.access_token_ciphertext && row.token_iv && row.token_tag) {
    const credentials = JSON.parse(decryptSecret(row.access_token_ciphertext, row.token_iv, row.token_tag)) as {
      access_token?: string;
      refresh_token?: string | null;
    };
    if (!credentials.access_token) throw new Error("Social credential is unavailable.");
    row.access_token = credentials.access_token;
    row.refresh_token = credentials.refresh_token || null;
  } else if (!row.access_token) {
    throw new Error("Social credential is unavailable.");
  }
  return row as Connection;
}
