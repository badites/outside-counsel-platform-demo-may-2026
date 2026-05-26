import { prisma } from "./db";

export async function getPlatformSetting(key: string): Promise<string | null> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key },
  });
  return setting?.value ?? null;
}

export async function upsertPlatformSetting(
  key: string,
  value: string
): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Convenience helpers for the AI briefing
export const AI_BRIEFING_KEY = "ai_briefing";

export async function getAiBriefing(): Promise<string> {
  return (await getPlatformSetting(AI_BRIEFING_KEY)) ?? "";
}

export async function saveAiBriefing(content: string): Promise<void> {
  if (!content.trim()) {
    // Delete the setting if empty
    await prisma.platformSetting.deleteMany({ where: { key: AI_BRIEFING_KEY } });
    return;
  }
  await upsertPlatformSetting(AI_BRIEFING_KEY, content.trim());
}
