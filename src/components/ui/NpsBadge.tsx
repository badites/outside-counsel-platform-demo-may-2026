import { cn } from "@/lib/utils";
import type { NpsAggregation } from "@/server/insights";

interface NpsBadgeProps {
  nps: NpsAggregation;
  size?: "sm" | "lg";
}

export function NpsBadge({ nps, size = "sm" }: NpsBadgeProps) {
  if (nps.total === 0) {
    return (
      <span className="text-xs text-gray-400">No NPS data</span>
    );
  }

  const color =
    nps.score > 50
      ? "bg-green-50 text-green-700 border-green-200"
      : nps.score >= 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border",
        color,
        size === "lg" ? "px-4 py-2" : "px-2.5 py-1"
      )}
    >
      <span
        className={cn(
          "font-bold",
          size === "lg" ? "text-2xl" : "text-sm"
        )}
      >
        {nps.score > 0 ? "+" : ""}
        {nps.score}
      </span>
      <div className="flex flex-col">
        <span
          className={cn(
            "font-medium",
            size === "lg" ? "text-xs" : "text-[10px]"
          )}
        >
          NPS
        </span>
        <span
          className={cn(
            "text-gray-500",
            size === "lg" ? "text-[10px]" : "text-[9px]"
          )}
        >
          {nps.total} response{nps.total !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

interface NpsBreakdownProps {
  nps: NpsAggregation;
}

export function NpsBreakdown({ nps }: NpsBreakdownProps) {
  if (nps.total === 0) return null;

  const pPct = Math.round((nps.promoters / nps.total) * 100);
  const paPct = Math.round((nps.passives / nps.total) * 100);
  const dPct = Math.round((nps.detractors / nps.total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        {pPct > 0 && (
          <div
            className="bg-green-500"
            style={{ width: `${pPct}%` }}
          />
        )}
        {paPct > 0 && (
          <div
            className="bg-amber-400"
            style={{ width: `${paPct}%` }}
          />
        )}
        {dPct > 0 && (
          <div
            className="bg-red-400"
            style={{ width: `${dPct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-green-600">
          {nps.promoters} promoter{nps.promoters !== 1 ? "s" : ""}
        </span>
        <span className="text-amber-600">
          {nps.passives} passive{nps.passives !== 1 ? "s" : ""}
        </span>
        <span className="text-red-600">
          {nps.detractors} detractor{nps.detractors !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
