import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
}

export function StarRating({ value, max = 5, label, size = "sm" }: StarRatingProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span
          className={cn(
            "text-gray-500",
            size === "sm" ? "text-xs w-32" : "text-sm w-40"
          )}
        >
          {label}
        </span>
      )}
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={cn(
              size === "sm" ? "text-sm" : "text-base",
              i < value ? "text-amber-400" : "text-gray-200"
            )}
          >
            ★
          </span>
        ))}
      </div>
      <span
        className={cn(
          "font-medium text-gray-700",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}

interface RatingAveragesProps {
  ratings: {
    responsiveness: number;
    quality: number;
    commercialAwareness: number;
    value: number;
    subjectMatterExpertise: number;
  }[];
}

export function RatingAverages({ ratings }: RatingAveragesProps) {
  if (ratings.length === 0) return null;

  const avg = (key: keyof RatingAveragesProps["ratings"][0]) =>
    ratings.reduce((sum, r) => sum + r[key], 0) / ratings.length;

  const dimensions = [
    { label: "Responsiveness", value: avg("responsiveness") },
    { label: "Quality", value: avg("quality") },
    { label: "Commercial Awareness", value: avg("commercialAwareness") },
    { label: "Value for Money", value: avg("value") },
    { label: "Subject Expertise", value: avg("subjectMatterExpertise") },
  ];

  return (
    <div className="space-y-1.5">
      {dimensions.map((d) => (
        <StarRating key={d.label} label={d.label} value={d.value} />
      ))}
    </div>
  );
}
