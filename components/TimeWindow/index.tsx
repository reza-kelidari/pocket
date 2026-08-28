// components/TimeWindow/index.tsx
"use client";

import { JSX } from "react";

export interface TimeWindowProps {
  isMounted: boolean;
  isVisible: boolean;
  options: { name: string; time: number }[];
  onSelect: (time: number) => void;
  activeTime: number;
  align?: "left" | "right";
}

export default function TimeWindow({
  isMounted,
  isVisible,
  options,
  onSelect,
  activeTime,
  align = "right",
}: TimeWindowProps): JSX.Element | null {
  if (!isMounted) return null;

  return (
    <div
      className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-2 p-2 flex flex-col gap-1 bg-white border border-elements-border rounded-2xl shadow-lg z-50 min-w-36 transition-all duration-300 ease-in-out transform ${
        align === "right" ? "origin-top-right" : "origin-top-left"
      } ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
      }`}
    >
      {options.map((option) => (
        <button
          key={option.time}
          type="button"
          onClick={() => onSelect(option.time)}
          className={`block w-full text-right px-4 rounded-md py-2.5 text-xs transition-colors cursor-pointer ${
            option.time === activeTime
              ? "text-primary font-bold bg-primary-background"
              : "text-black hover:bg-elements-background"
          }`}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
