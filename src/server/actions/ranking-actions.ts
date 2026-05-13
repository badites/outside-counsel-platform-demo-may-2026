"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRankingSourceSchema,
  createFirmRankingSchema,
  createLawyerRankingSchema,
} from "@/lib/schemas";
import {
  createRankingSource,
  createFirmRanking,
  createLawyerRanking,
  deleteFirmRanking,
  deleteLawyerRanking,
} from "@/server/rankings";

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createRankingSourceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createRankingSourceSchema.safeParse({
    ...raw,
    url: raw.url || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  await createRankingSource(parsed.data);
  redirect("/admin/rankings");
}

export async function createFirmRankingAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createFirmRankingSchema.safeParse({
    ...raw,
    band: raw.band || undefined,
    tier: raw.tier || undefined,
    starRating: raw.starRating || undefined,
    editorialExcerpt: raw.editorialExcerpt || undefined,
    url: raw.url || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  await createFirmRanking(parsed.data);
  revalidatePath("/admin/rankings");
  revalidatePath(`/firms/${parsed.data.firmId}`);
  revalidatePath("/rankings");
  return { success: true, message: "Firm ranking added" };
}

export async function createLawyerRankingAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = createLawyerRankingSchema.safeParse({
    ...raw,
    editorialExcerpt: raw.editorialExcerpt || undefined,
    url: raw.url || undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Validation failed",
    };
  }

  await createLawyerRanking(parsed.data);
  revalidatePath("/admin/rankings");
  revalidatePath(`/lawyers/${parsed.data.lawyerId}`);
  revalidatePath("/rankings");
  return { success: true, message: "Lawyer ranking added" };
}

export async function deleteFirmRankingAction(id: string, firmId: string) {
  await deleteFirmRanking(id);
  revalidatePath(`/firms/${firmId}`);
  revalidatePath("/rankings");
  revalidatePath("/admin/rankings");
}

export async function deleteLawyerRankingAction(id: string, lawyerId: string) {
  await deleteLawyerRanking(id);
  revalidatePath(`/lawyers/${lawyerId}`);
  revalidatePath("/rankings");
  revalidatePath("/admin/rankings");
}
