import type { NextRequest } from "next/server";
import type { AuthContext } from "./auth-context";

export async function requireSupabaseAuthContext(
  request: NextRequest
): Promise<AuthContext> {
  const url = process.env.SAM_SUPABASE_URL;
  const anonKey = process.env.SAM_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "SAM authentication provider is not configured. Protected operation denied."
    );
  }

  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\\s+(.+)$/i);
  if (!match) {
    throw new Error("Authenticated SAM session required.");
  }

  const response = await fetch(
    `${url.replace(/\\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${match[1]}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("SAM session verification failed.");
  }

  const user = (await response.json()) as { id?: unknown };
  if (typeof user.id !== "string" || !user.id) {
    throw new Error("SAM session did not contain a valid user identity.");
  }

  return { userId: user.id };
}
