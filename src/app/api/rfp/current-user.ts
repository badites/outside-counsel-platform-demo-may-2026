import { prisma } from "@/server/db";

export async function getCurrentUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error("No users in database");
  return user.id;
}
