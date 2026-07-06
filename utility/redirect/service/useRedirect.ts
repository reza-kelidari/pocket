"use client";

import { useSyncExternalStore } from "react";
import { redirectStore } from "./redirectStore";

export function useRedirect() {
  const redirects = useSyncExternalStore(
    redirectStore.subscribe,
    redirectStore.getSnapshot,
    redirectStore.getSnapshot,
  );

  return {
    redirects,
    last: redirectStore.last.bind(redirectStore),
    add: redirectStore.add.bind(redirectStore),
    back: redirectStore.back.bind(redirectStore),
    clear: redirectStore.clear.bind(redirectStore),
    getAll: redirectStore.getAll.bind(redirectStore),
  };
}
