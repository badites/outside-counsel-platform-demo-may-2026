"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";

export default function RfpError({
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
      title="RFP error"
      backHref="/rfp"
      backLabel="Back to RFPs"
    />
  );
}
