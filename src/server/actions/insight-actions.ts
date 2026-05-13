"use server";

import { revalidatePath } from "next/cache";
import {
  createRecommendationSchema,
  createInternalRatingSchema,
  createNoteSchema,
} from "@/lib/schemas";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/current-user";

export type InsightActionState = {
  success: boolean;
  error?: string;
};

// ─── NPS Recommendation ────────────────────────────────────────────────────

export async function addRecommendationAction(
  _prev: InsightActionState,
  formData: FormData
): Promise<InsightActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createRecommendationSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await getCurrentUser();

    await prisma.recommendation.create({
      data: {
        targetType: parsed.data.targetType,
        firmId: parsed.data.firmId || null,
        lawyerId: parsed.data.lawyerId || null,
        recommenderId: user.id,
        npsScore: parsed.data.npsScore,
        practiceAreaId: parsed.data.practiceAreaId || null,
        reason: parsed.data.reason || null,
      },
    });

    const path = parsed.data.targetType === "FIRM"
      ? `/firms/${parsed.data.firmId}`
      : `/lawyers/${parsed.data.lawyerId}`;
    revalidatePath(path);
    revalidatePath("/directory");

    return { success: true };
  } catch (err) {
    console.error("Failed to add recommendation:", err);
    return { success: false, error: "Failed to save recommendation" };
  }
}

// ─── Internal Rating ───────────────────────────────────────────────────────

export async function addInternalRatingAction(
  _prev: InsightActionState,
  formData: FormData
): Promise<InsightActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createInternalRatingSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await getCurrentUser();
    const d = parsed.data;
    const overallScore = (d.responsiveness + d.quality + d.commercialAwareness + d.value + d.subjectMatterExpertise) / 5;

    await prisma.internalRating.create({
      data: {
        targetType: d.targetType,
        firmId: d.firmId || null,
        lawyerId: d.lawyerId || null,
        ratedById: user.id,
        responsiveness: d.responsiveness,
        quality: d.quality,
        commercialAwareness: d.commercialAwareness,
        value: d.value,
        subjectMatterExpertise: d.subjectMatterExpertise,
        overallScore,
        comment: d.comment || null,
      },
    });

    const path = d.targetType === "FIRM"
      ? `/firms/${d.firmId}`
      : `/lawyers/${d.lawyerId}`;
    revalidatePath(path);
    revalidatePath("/directory");

    return { success: true };
  } catch (err) {
    console.error("Failed to add rating:", err);
    return { success: false, error: "Failed to save rating" };
  }
}

// ─── Relationship Note ─────────────────────────────────────────────────────

export async function addNoteAction(
  _prev: InsightActionState,
  formData: FormData
): Promise<InsightActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createNoteSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await getCurrentUser();

    await prisma.relationshipNote.create({
      data: {
        targetType: parsed.data.targetType,
        firmId: parsed.data.firmId || null,
        lawyerId: parsed.data.lawyerId || null,
        authorId: user.id,
        content: parsed.data.content,
        isPinned: parsed.data.isPinned,
      },
    });

    const path = parsed.data.targetType === "FIRM"
      ? `/firms/${parsed.data.firmId}`
      : `/lawyers/${parsed.data.lawyerId}`;
    revalidatePath(path);

    return { success: true };
  } catch (err) {
    console.error("Failed to add note:", err);
    return { success: false, error: "Failed to save note" };
  }
}
