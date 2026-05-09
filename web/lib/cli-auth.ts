// 5-minute TTL for in-flight CLI auth requests.
export const CLI_AUTH_TTL_MS = 5 * 60 * 1000;

// Loopback ports allowed for callbacks. Keep generous to support racing pickers.
export const MIN_CALLBACK_PORT = 1024;
export const MAX_CALLBACK_PORT = 65535;

export function isValidCallbackPort(port: unknown): port is number {
  return (
    typeof port === "number" &&
    Number.isInteger(port) &&
    port >= MIN_CALLBACK_PORT &&
    port <= MAX_CALLBACK_PORT
  );
}

// State token shape: 32 hex chars. Reject anything else to prevent oddities.
export function isValidState(state: unknown): state is string {
  return typeof state === "string" && /^[a-f0-9]{32}$/.test(state);
}
