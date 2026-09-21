import type { NextRequest } from "next/server";

/**
 * SAM authentication boundary.
 *
 * This module deliberately does not trust client-supplied user IDs.
 * Until the SAM-owned auth provider is connected, protected operations
 * must fail closed rather than falling back to anonymous access.
 */
export type AuthContext = {
  userId: string;
};

export function requireAuthContext(_request: NextRequest): AuthContext {
  throw new Error(
    "SAM authentication is not configured. Protected operation denied."
  );
}
