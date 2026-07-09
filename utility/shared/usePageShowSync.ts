import { useEffect } from "react";

export function usePageShowSync(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") callback();
    };

    window.addEventListener("focus", callback);
    window.addEventListener("pageshow", callback);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", callback);
      window.removeEventListener("pageshow", callback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}