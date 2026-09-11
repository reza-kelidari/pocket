// utility/shared/usePageShowSync.ts
import { useEffect, useRef } from "react";

export function usePageShowSync(callback: () => void, deps: any[] = []) {
  const callbackRef = useRef(callback);

  callbackRef.current = callback;

  useEffect(() => {
    const handler = () => callbackRef.current();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    };

    window.addEventListener("focus", handler);
    window.addEventListener("pageshow", handler);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handler);
      window.removeEventListener("pageshow", handler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
