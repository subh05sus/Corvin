import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-key";
import { decryptKey } from "@/lib/crypto";

// POST /api/cli/validate
// Body: { authKey: string }
// Returns: { valid: true, userId: string, ai: { provider, model, apiKey } | null } | { valid: false }
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
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      user: {
        select: {
          aiConfig: {
            select: {
              defaultProvider: true,
              defaultModel: true,
              openaiKeyEnc: true,
              anthropicKeyEnc: true,
              geminiKeyEnc: true,
            },
          },
        },
      },
    },
  });

  if (!apiKey || apiKey.revokedAt) {
    return NextResponse.json({ valid: false });
  }

  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  let ai: { provider: string; model: string; apiKey: string } | null = null;
  const cfg = apiKey.user?.aiConfig;
  if (cfg) {
    const encKeyMap: Record<string, string | null> = {
      openai: cfg.openaiKeyEnc ?? null,
      anthropic: cfg.anthropicKeyEnc ?? null,
      gemini: cfg.geminiKeyEnc ?? null,
    };
    const enc = encKeyMap[cfg.defaultProvider] ?? null;
    if (enc) {
      try {
        ai = {
          provider: cfg.defaultProvider,
          model: cfg.defaultModel,
          apiKey: decryptKey(enc),
        };
      } catch (err) {
        console.error("[validate] Failed to decrypt AI key:", err);
      }
    }
  }

  return NextResponse.json({ valid: true, userId: apiKey.userId, ai });
}
