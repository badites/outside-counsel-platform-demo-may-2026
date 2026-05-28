"use client";

import { useState } from "react";
import { Link2, Check, Loader2 } from "lucide-react";

export function CopyLinkButton({
  rfpId,
  invitationId,
}: {
  rfpId: string;
  invitationId: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  async function handleCopy() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/rfp/${rfpId}/invitations/${invitationId}/token`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:text-gray-400"
      title="Copy unique proposal link for this firm"
    >
      {state === "loading" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : state === "copied" ? (
        <Check size={10} className="text-scg-600" />
      ) : (
        <Link2 size={10} />
      )}
      {state === "copied" ? "Copied!" : "Copy link"}
    </button>
  );
}
