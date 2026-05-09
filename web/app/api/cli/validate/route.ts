import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-key";

// POST /api/cli/validate
// Body: { authKey: string }
// Returns: { valid: true, userId: string } | { valid: false }
//
// Called by the Fastify server on every WebSocket connect to verify the
// CLI's authKey. Updates `lastUsedAt` on hit.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const { authKey } = (body ?? {}) as { authKey?: unknown };
  if (typeof authKey !== "string" || authKey.length < 16) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const keyHash = hashApiKey(authKey);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!apiKey || apiKey.revokedAt) {
    return NextResponse.json({ valid: false });
  }

  // Fire-and-forget: update lastUsedAt without blocking the response.
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Don't let analytics writes crash auth.
    });

  return NextResponse.json({ valid: true, userId: apiKey.userId });
}
