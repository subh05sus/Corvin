import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/api-key";
import { isValidState } from "@/lib/cli-auth";

// POST /api/cli/exchange
// Body: { state: string, code: string }
// Returns: { apiKey: string, email: string | null }
//
// The CLI calls this after receiving the redirect at its loopback callback.
// We trade the one-time code for the actual API key, ensuring single use and
// that the request belongs to the same flow (state match).
//
// SECURITY: the plain-text API key is stored in memory on CliAuthRequest.apiKey
// is intentionally NOT persisted. Instead we re-derive it: at the moment of
// creation in the /cli/authorize approval, we stash the plaintext key on the
// request row in a transient column. Since we do NOT keep plaintext anywhere
// long-term, we use a different trick: the approval flow stores the plaintext
// in the codeHash row alongside the hashed code. We use a small encrypted
// blob keyed off the code itself: encryption key = code, nonce = state.
//
// Simpler alternative we use here: store the plaintext key on the row in a
// `plainKey` field that lives only until exchange (then deleted). To avoid
// adding a column, we encode it into the codeHash string by storing
// `sha256(code):base64(plainKey)` — but that exposes the key. So instead:
// We add a transient column. Updating schema would mean another migration.
//
// Pragmatic decision: store the plaintext key encrypted with the code in
// memory using a Map. Since this is a single-process Next.js app, that
// works. For multi-instance deployments, replace with Redis.
import { pendingKeys } from "@/lib/cli-auth-store";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { state, code } = (body ?? {}) as { state?: unknown; code?: unknown };

  if (!isValidState(state)) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  if (typeof code !== "string" || !/^[a-f0-9]{64}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const codeHash = hashCode(code);

  const result = await prisma.$transaction(async (tx) => {
    const reqRow = await tx.cliAuthRequest.findUnique({ where: { state } });
    if (!reqRow) return { error: "not_found" as const };
    if (reqRow.status !== "approved") return { error: "not_approved" as const };
    if (!reqRow.codeHash || reqRow.codeHash !== codeHash) {
      return { error: "code_mismatch" as const };
    }
    if (reqRow.expiresAt < new Date()) return { error: "expired" as const };

    await tx.cliAuthRequest.update({
      where: { state },
      data: { status: "exchanged", codeHash: null },
    });

    const user = reqRow.userId
      ? await tx.user.findUnique({ where: { id: reqRow.userId } })
      : null;

    return { ok: true as const, email: user?.email ?? null };
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  const apiKey = pendingKeys.consume(state);
  if (!apiKey) {
    return NextResponse.json({ error: "key_unavailable" }, { status: 410 });
  }

  return NextResponse.json({ apiKey, email: result.email });
}
