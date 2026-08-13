import { useCallback, useEffect, useRef } from "react";

export function useScrollRestoration(key: string, isReady: boolean) {
  const suppressRef = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    suppressRef.current = false;

    let ticking = false;
    const handleScroll = () => {
      if (suppressRef.current) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!suppressRef.current) {
          sessionStorage.setItem(key, String(window.scrollY));
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const handleClickCapture = (e: MouseEvent) => {
      if (suppressRef.current) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      sessionStorage.setItem(key, String(window.scrollY));

      suppressRef.current = true;
    };
    document.addEventListener("click", handleClickCapture, true);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickCapture, true);
    };
  }, [key]);

  useEffect(() => {
    if (!isReady) return;

    const saved = sessionStorage.getItem(key);
    const target = saved ? parseInt(saved, 10) : 0;
    if (target <= 0) return;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
      observer.disconnect();
      clearTimeout(fallback);
    };

    const observer = new ResizeObserver(() => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll >= target) settle();
    });
    observer.observe(document.body);

    const fallback = setTimeout(settle, 1500);

    return () => {
      settled = true;
      observer.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, key]);

  const clearSavedPosition = useCallback(() => {
    suppressRef.current = true;
    sessionStorage.removeItem(key);
  }, [key]);

  return { clearSavedPosition };
}
