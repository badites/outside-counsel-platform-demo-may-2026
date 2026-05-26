"use client";

import { Navigation } from "lucide-react";

export function TourTrigger() {
  function handleClick() {
    const fn = (window as unknown as Record<string, unknown>).__restartProductTour;
    if (typeof fn === "function") {
      (fn as () => void)();
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Take a guided tour"
      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
    >
      <Navigation size={16} />
    </button>
  );
}
