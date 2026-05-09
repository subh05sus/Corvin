import { config } from "../config";

// Validate a CLI API key by asking the dashboard. The dashboard owns the
// Postgres database and is the only authority on key state.
//
// Returns the userId if the key is valid, or null otherwise.
export async function validateAuthKey(authKey: string): Promise<string | null> {
  if (!authKey || typeof authKey !== "string") return null;

  const url = `${config.web_dashboard_url.replace(/\/$/, "")}/api/cli/validate`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authKey }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { valid?: boolean; userId?: string };
    if (data.valid && typeof data.userId === "string") {
      return data.userId;
    }
    return null;
  } catch (err) {
    // Network error talking to dashboard. Don't fail open — return null.
    console.error("[validateAuthKey] dashboard unreachable:", err);
    return null;
  }
}
