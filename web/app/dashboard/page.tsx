import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewKeyDialog } from "@/components/new-key-dialog";
import { RevokeKeyButton } from "@/components/revoke-key-button";

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">API keys</h1>
          <p className="text-muted-foreground text-sm">
            Signed in as {session.user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/ai-keys">
            <Button variant="outline">AI provider keys</Button>
          </Link>
          <NewKeyDialog />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="rounded-md border">
        {keys.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No keys yet. Create one to authenticate the Corvin CLI.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">{k.prefix}…</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(k.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(k.lastUsedAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {k.revokedAt ? (
                      <span className="text-muted-foreground">Revoked</span>
                    ) : (
                      <span className="text-green-600 dark:text-green-500">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!k.revokedAt && <RevokeKeyButton id={k.id} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
