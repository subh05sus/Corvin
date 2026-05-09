"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey, hashApiKey, getKeyPrefix } from "@/lib/api-key";

export async function createApiKey(formData: FormData): Promise<{ key: string; id: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  if (name.length > 100) {
    throw new Error("Name must be 100 characters or fewer");
  }

  const key = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash: hashApiKey(key),
      prefix: getKeyPrefix(key),
    },
  });

  revalidatePath("/dashboard");
  return { key, id: created.id };
}

export async function revokeApiKey(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Only allow revoking keys owned by the current user.
  await prisma.apiKey.updateMany({
    where: { id, userId: session.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/dashboard");
}
