"use client";

import { useSyncExternalStore } from "react";

// Rendered on the phone so the date is always the device's "today",
// not the day the site was last built.
function formatToday() {
  return new Date()
    .toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

export function TodayDate() {
  const label = useSyncExternalStore(
    () => () => {},
    formatToday,
    () => "TODAY",
  );
  return <>{label}</>;
}
