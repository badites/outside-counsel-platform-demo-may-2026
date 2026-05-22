"use client";

import { Sparkles } from "lucide-react";

export function AiGeneratedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Sparkles size={12} />
      AI-generated
    </span>
  );
}
