import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Page() {
  const session = await auth();

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <h1 className="font-heading text-4xl">Corvin</h1>
        <p className="text-muted-foreground text-sm leading-loose">
          AI debugging copilot for running applications. Sign in to manage the API keys
          your CLI uses.
        </p>
        <div className="flex gap-2">
          {session?.user ? (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
