import { SupabaseAuditStore } from "./supabase-audit";
import { SupabaseJobRepository } from "./supabase-job-repository";

export function samRepositories() {
  return {
    jobs: new SupabaseJobRepository(),
    audit: new SupabaseAuditStore(),
  };
}
