import { redirect } from "next/navigation";
import os from "os";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateApiKey,
  generateOneTimeCode,
  getKeyPrefix,
  hashApiKey,
  hashCode,
} from "@/lib/api-key";
import { isValidState } from "@/lib/cli-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthorizePageProps {
  searchParams: Promise<{ state?: string; error?: string }>;
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps) {
  const params = await searchParams;
  const state = params.state;

  if (!state || !isValidState(state)) {
    return <ErrorView title="Invalid request" message="The auth link is malformed." />;
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/cli/authorize?state=${state}`)}`);
  }

  const reqRow = await prisma.cliAuthRequest.findUnique({ where: { state } });
  if (!reqRow) {
    return <ErrorView title="Request not found" message="This auth link has expired or was never issued." />;
  }
  if (reqRow.expiresAt < new Date()) {
    return <ErrorView title="Request expired" message="Run `corvin login` again from the CLI." />;
  }
  if (reqRow.status === "exchanged") {
    return <SuccessView />;
  }
  if (reqRow.status === "denied") {
    return <ErrorView title="Request denied" message="This auth request was denied." />;
  }

  // Already approved but not exchanged yet → render success (CLI is mid-exchange).
  if (reqRow.status === "approved") {
    return <SuccessView />;
  }

  async function approve() {
    "use server";
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    if (!state) {
      throw new Error("Missing state");
    }

    const reqRow = await prisma.cliAuthRequest.findUnique({ where: { state } });
    if (!reqRow || reqRow.status !== "pending" || reqRow.expiresAt < new Date()) {
      throw new Error("Request not approvable");
    }

    const apiKey = generateApiKey();
    const code = generateOneTimeCode();

    const created = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: `CLI: ${os.hostname()}`,
        keyHash: hashApiKey(apiKey),
        prefix: getKeyPrefix(apiKey),
      },
    });

    await prisma.cliAuthRequest.update({
      where: { state },
      data: {
        userId: session.user.id,
        apiKeyId: created.id,
        codeHash: hashCode(code),
        pendingApiKey: apiKey,
        status: "approved",
      },
    });

    redirect(`http://127.0.0.1:${reqRow.callbackPort}/callback?state=${state}&code=${code}`);
  }

  async function deny() {
    "use server";
    if (!state) return;
    await prisma.cliAuthRequest.updateMany({
      where: { state, status: "pending" },
      data: { status: "denied" },
    });
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Authorize Corvin CLI</CardTitle>
          <CardDescription>
            Allow the CLI on this machine to act as <strong>{session.user.email}</strong>?
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          A new API key will be created and sent back to the CLI. You can revoke it any
          time from the dashboard.
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <form action={deny}>
            <Button type="submit" variant="outline">
              Deny
            </Button>
          </form>
          <form action={approve}>
            <Button type="submit">Approve</Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">All set</CardTitle>
          <CardDescription>
            You can return to your terminal — the CLI is signed in.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
