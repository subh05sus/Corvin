import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveAiKey, clearAiKey, setDefaultProvider } from "./actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PROVIDERS = [
  { id: "gemini" as const, label: "Google Gemini", placeholder: "AIza...", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"] },
  { id: "openai" as const, label: "OpenAI", placeholder: "sk-...", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { id: "anthropic" as const, label: "Anthropic", placeholder: "sk-ant-...", models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5"] },
];

export default async function AiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/ai-keys");
  }

  const cfg = await prisma.userAiConfig.findUnique({
    where: { userId: session.user.id },
    select: {
      defaultProvider: true,
      defaultModel: true,
      openaiKeyEnc: true,
      anthropicKeyEnc: true,
      geminiKeyEnc: true,
    },
  });

  const hasKey: Record<string, boolean> = {
    openai: !!cfg?.openaiKeyEnc,
    anthropic: !!cfg?.anthropicKeyEnc,
    gemini: !!cfg?.geminiKeyEnc,
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">AI provider keys</h1>
          <p className="text-muted-foreground text-sm">
            Your keys are encrypted at rest. Only the key for your default provider is sent to the Corvin server on connection.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">← Back</Button>
        </Link>
      </header>

      <section className="rounded-md border p-6 space-y-6">
        <h2 className="font-semibold text-lg">Default provider</h2>
        <p className="text-muted-foreground text-sm">
          Currently: <span className="font-mono font-medium">{cfg?.defaultProvider ?? "gemini"}</span> /&nbsp;
          <span className="font-mono font-medium">{cfg?.defaultModel ?? "gemini-2.5-flash"}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {PROVIDERS.map((p) => (
            <form key={p.id} action={async () => { "use server"; await setDefaultProvider(p.id, p.models[0]); }}>
              <Button
                type="submit"
                variant={cfg?.defaultProvider === p.id ? "default" : "outline"}
                size="sm"
              >
                {p.label}
              </Button>
            </form>
          ))}
        </div>
      </section>

      {PROVIDERS.map((p) => (
        <section key={p.id} className="rounded-md border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">{p.label}</h2>
            {hasKey[p.id] ? (
              <span className="text-xs text-green-600 dark:text-green-500 font-medium">Key saved</span>
            ) : (
              <span className="text-xs text-muted-foreground">No key</span>
            )}
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              const key = formData.get("apiKey") as string;
              if (key?.trim()) await saveAiKey(p.id, key);
            }}
            className="flex gap-2"
          >
            <input
              name="apiKey"
              type="password"
              placeholder={hasKey[p.id] ? "••••••••••••  (replace)" : p.placeholder}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm">Save</Button>
          </form>

          {hasKey[p.id] && (
            <form action={async () => { "use server"; await clearAiKey(p.id); }}>
              <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                Remove key
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground">
            Models: {p.models.join(", ")}
          </p>
        </section>
      ))}

      <section className="rounded-md border p-4 text-sm space-y-2">
        <p className="font-medium">Using Corvin without a stored key</p>
        <p className="text-muted-foreground">
          If no key is stored, the Corvin server falls back to its own <code className="font-mono">GEMINI_API_KEY</code> env var (if set by the server operator). Self-hosted users can skip this page and configure the key in <code className="font-mono">server/.env</code>.
        </p>
      </section>
    </div>
  );
}
