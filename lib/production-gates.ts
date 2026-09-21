export function requireProductionDatabaseConfig(): {
  url: string;
  anonKey: string;
} {
  const url = process.env.SAM_SUPABASE_URL;
  const anonKey = process.env.SAM_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "SAM production database configuration is missing. Refusing to start protected persistence."
    );
  }

  return { url, anonKey };
}

export function requireServerAuthConfig(): void {
  const provider = process.env.SAM_AUTH_PROVIDER;
  if (!provider) {
    throw new Error(
      "SAM authentication provider is not configured. Refusing protected operations."
    );
  }
}
