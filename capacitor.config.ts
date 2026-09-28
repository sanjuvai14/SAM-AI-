import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.sanjuvai.sam",
  appName: "SAM",
  webDir: "public",
  server: {
    url: "https://sam-ai-2026.vercel.app",
    cleartext: false
  }
};

export default config;
