import { randomBytes, createHash } from "crypto";

export const API_KEY_PREFIX = "corvin_live_";

export function generateApiKey(): string {
  // 32 random bytes → 64 hex chars
  const random = randomBytes(32).toString("hex");
  return `${API_KEY_PREFIX}${random}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function getKeyPrefix(key: string): string {
  // Show first 8 chars after the namespace prefix, e.g. corvin_live_a1b2c3d4
  return key.slice(0, API_KEY_PREFIX.length + 8);
}

export function generateOneTimeCode(): string {
  return randomBytes(32).toString("hex");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateState(): string {
  return randomBytes(16).toString("hex");
}
