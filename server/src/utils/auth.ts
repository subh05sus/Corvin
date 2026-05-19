import { config } from "../config";
import type { ProviderConfig } from "../services/ai-provider";

export interface AuthSession {
  userId: string;
  ai: ProviderConfig | null;
}

interface CacheEntry {
  session: AuthSession;
  expiresAt: number;
}

const AUTH_CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function validateAuthKey(authKey: string): Promise<AuthSession | null> {
  if (!authKey || typeof authKey !== "string") return null;

  const now = Date.now();
  const cached = cache.get(authKey);
  if (cached && cached.expiresAt > now) {
    return cached.session;
  }

  const url = `${config.web_dashboard_url.replace(/\/$/, "")}/api/cli/validate`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authKey }),
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as {
      valid?: boolean;
      userId?: string;
      ai?: { provider: string; model: string; apiKey: string } | null;
    };

    if (!data.valid || typeof data.userId !== "string") return null;

    const session: AuthSession = {
      userId: data.userId,
      ai: data.ai
        ? { provider: data.ai.provider as ProviderConfig["provider"], model: data.ai.model, apiKey: data.ai.apiKey }
        : null,
    };

    cache.set(authKey, { session, expiresAt: now + AUTH_CACHE_TTL_MS });
    return session;
  } catch (err) {
    console.error("[validateAuthKey] dashboard unreachable:", err);
    return null;
  }
}

export function invalidateAuthCache(authKey: string): void {
  cache.delete(authKey);
}
