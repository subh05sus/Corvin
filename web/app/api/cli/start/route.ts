import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLI_AUTH_TTL_MS,
  isValidCallbackPort,
  isValidState,
} from "@/lib/cli-auth";

// POST /api/cli/start
// Body: { state: string, callbackPort: number }
// Returns: { authUrl: string, expiresAt: string }
//
// Called by the CLI before it opens the browser. We persist the request and
// hand back a URL pointing at /cli/authorize, where the user signs in (if not
// already) and approves the key issuance.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { state, callbackPort } = (body ?? {}) as {
    state?: unknown;
    callbackPort?: unknown;
  };

  if (!isValidState(state)) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }
  if (!isValidCallbackPort(callbackPort)) {
    return NextResponse.json({ error: "invalid_callback_port" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + CLI_AUTH_TTL_MS);

  await prisma.cliAuthRequest.create({
    data: {
      state,
      callbackPort,
      status: "pending",
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const authUrl = `${baseUrl}/cli/authorize?state=${state}`;

  return NextResponse.json({ authUrl, expiresAt: expiresAt.toISOString() });
}
