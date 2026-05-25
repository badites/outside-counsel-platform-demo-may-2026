"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";

export default function EvaluateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Evaluation error"
      backHref="/rfp"
      backLabel="Back to RFPs"
    />
  );
}
