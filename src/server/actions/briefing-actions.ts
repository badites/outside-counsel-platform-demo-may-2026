"use server";

import { revalidatePath } from "next/cache";
import { saveAiBriefing } from "@/server/platform-settings";

export type BriefingActionState = {
  success: boolean;
  error?: string;
};

export async function updateBriefingAction(
  _prev: BriefingActionState,
  formData: FormData
): Promise<BriefingActionState> {
  const content = formData.get("aiBriefing") as string;

  if (content && content.length > 10000) {
    return { success: false, error: "Briefing must be under 10,000 characters" };
  }

  try {
    await saveAiBriefing(content ?? "");
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("Failed to save AI briefing:", err);
    return { success: false, error: "Failed to save briefing" };
  }
}
