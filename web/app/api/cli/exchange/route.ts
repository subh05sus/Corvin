import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashCode } from "@/lib/api-key";
import { isValidState } from "@/lib/cli-auth";

// POST /api/cli/exchange
// Body: { state: string, code: string }
// Returns: { apiKey: string, email: string | null }
//
// Trades the one-time code for the plaintext API key stored on the
// CliAuthRequest row (pendingApiKey), then clears it atomically.
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
      data: { status: "exchanged", codeHash: null, pendingApiKey: null },
    });

    const apiKey = reqRow.pendingApiKey;
    if (!apiKey) return { error: "key_unavailable" as const };

    const user = reqRow.userId
      ? await tx.user.findUnique({ where: { id: reqRow.userId } })
      : null;

    return { ok: true as const, apiKey, email: user?.email ?? null };
  });

  if ("error" in result) {
    const status =
      result.error === "not_found" ? 404 : result.error === "key_unavailable" ? 410 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ apiKey: result.apiKey, email: result.email });
}
