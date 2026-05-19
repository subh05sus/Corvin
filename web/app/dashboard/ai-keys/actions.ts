"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptKey } from "@/lib/crypto";

type Provider = "openai" | "anthropic" | "gemini";

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
};

export async function saveAiKey(provider: Provider, apiKey: string, model?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error("API key cannot be empty");

  const encField: Record<Provider, string> = {
    openai: "openaiKeyEnc",
    anthropic: "anthropicKeyEnc",
    gemini: "geminiKeyEnc",
  };

  const encrypted = encryptKey(trimmedKey);

  await prisma.userAiConfig.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      [encField[provider]]: encrypted,
    },
    update: {
      [encField[provider]]: encrypted,
    },
  });

  revalidatePath("/dashboard/ai-keys");
}

export async function clearAiKey(provider: Provider) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const encField: Record<Provider, string> = {
    openai: "openaiKeyEnc",
    anthropic: "anthropicKeyEnc",
    gemini: "geminiKeyEnc",
  };

  await prisma.userAiConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: { [encField[provider]]: null },
  });

  revalidatePath("/dashboard/ai-keys");
}

export async function setDefaultProvider(provider: Provider, model: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await prisma.userAiConfig.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      defaultProvider: provider,
      defaultModel: model || DEFAULT_MODELS[provider],
    },
    update: {
      defaultProvider: provider,
      defaultModel: model || DEFAULT_MODELS[provider],
    },
  });

  revalidatePath("/dashboard/ai-keys");
}
