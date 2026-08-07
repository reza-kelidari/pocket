"use client";

import { useEffect } from "react";
import Database from "@/icons/Database";

export default function ProcessingOverlay({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
      window.history.forward();
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-7.5 z-50 animate-fade-in">
      <div className="w-full max-w-md flex flex-col items-center gap-10">
        <div className="h-16 w-16 rounded-4xl bg-primary-background border border-primary-border grid place-content-center">
          <Database
            height={35}
            width={35}
            className="fill-primary animate-pulse"
          />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-secondary text-sm">{subtitle}</p>}
        </div>

        <div className="w-full bg-elements-background rounded-2xl h-3 overflow-hidden">
          <div className="bg-primary h-full rounded-2xl w-1/3 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
