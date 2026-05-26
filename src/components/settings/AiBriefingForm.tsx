"use client";

import { useActionState } from "react";
import {
  updateBriefingAction,
  type BriefingActionState,
} from "@/server/actions/briefing-actions";

interface AiBriefingFormProps {
  currentBriefing: string;
}

export function AiBriefingForm({ currentBriefing }: AiBriefingFormProps) {
  const [state, formAction, isPending] = useActionState<BriefingActionState, FormData>(
    updateBriefingAction,
    { success: false }
  );

  return (
    <form action={formAction}>
      <div className="space-y-3">
        <textarea
          name="aiBriefing"
          defaultValue={currentBriefing}
          rows={8}
          maxLength={10000}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-scg-500 focus:outline-none focus:ring-1 focus:ring-scg-500"
          placeholder={`Write instructions that guide all AI recommendations. Examples:

- "Picazo Buyco Law Offices and SyCip Salazar are corporate secretary firms only — never recommend for M&A advisory or litigation."
- "For cross-border M&A in Southeast Asia, always consider Rajah & Tann and Allen & Overy first."
- "Baker McKenzie is our preferred firm for employment matters across APAC."
- "Avoid recommending firms with fewer than 50 lawyers for complex multi-jurisdictional matters."
- "When a practice area has less than 30% outsource rate in timesheets, mention that we usually handle it in-house."`}
        />
        <p className="text-xs text-gray-500">
          This briefing is injected into every AI Counsel Finder conversation as overarching guidance.
          Use it to encode institutional knowledge that overrides raw data.
        </p>
      </div>

      {state.error && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
          AI briefing saved! The Counsel Finder will use these instructions in all future conversations.
        </div>
      )}

      <div className="mt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-scg-600 px-6 py-2 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Briefing"}
        </button>
      </div>
    </form>
  );
}
