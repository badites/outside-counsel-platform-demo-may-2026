import { AiGeneratedBadge } from "@/components/shared/AiGeneratedBadge";

export function ComparisonReport({
  content,
  generatedAt,
}: {
  content: string;
  generatedAt: Date | string;
}) {
  const date = typeof generatedAt === "string" ? new Date(generatedAt) : generatedAt;

  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700">AI Comparison Report</h2>
          <AiGeneratedBadge />
        </div>
        <span className="text-xs text-gray-400">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      </div>
      <div className="mt-4 prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
