"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTimeWindow() {
  const [show, setShow] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setIsMounted(true);
      const t = setTimeout(() => setIsVisible(true), 15);
      return () => clearTimeout(t);
    }
    setIsVisible(false);
    const t = setTimeout(() => setIsMounted(false), 200);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  const toggle = useCallback(() => setShow((v) => !v), []);
  const close = useCallback(() => setShow(false), []);

  return { show, isMounted, isVisible, dropdownRef, toggle, close };
}
