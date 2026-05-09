// In-memory store for plaintext API keys awaiting CLI exchange.
//
// Lifecycle:
//   1. /cli/authorize approves → stash key here (TTL 5 min) and write
//      everything else (codeHash, userId, etc.) to Postgres.
//   2. /api/cli/exchange consumes → key is removed from this map.
//
// Single-process only. For multi-instance deployments, swap this for Redis
// with a 5-minute TTL on each entry.

const TTL_MS = 5 * 60 * 1000;

type Entry = { key: string; expiresAt: number };

const globalForStore = globalThis as unknown as {
  __corvinPendingKeys?: Map<string, Entry>;
};

const store: Map<string, Entry> =
  globalForStore.__corvinPendingKeys ?? new Map<string, Entry>();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__corvinPendingKeys = store;
}

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }
}

export const pendingKeys = {
  put(state: string, key: string) {
    sweep();
    store.set(state, { key, expiresAt: Date.now() + TTL_MS });
  },
  consume(state: string): string | null {
    sweep();
    const entry = store.get(state);
    if (!entry) return null;
    store.delete(state);
    if (entry.expiresAt < Date.now()) return null;
    return entry.key;
  },
};
