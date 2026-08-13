"use client";

import { useEffect } from "react";
import Database from "@/icons/Database";
import type { IconComponent } from "@/icons/types";

/**
 * Props for the ProcessingOverlay component.
 */
interface ProcessingOverlayProps {
  /** Main title displayed prominently at the top of the overlay. */
  title: string;
  /** Optional subtitle or description shown below the main title. */
  subtitle?: string;
  /**
   * Progress percentage (0–100).
   *
   * - If `undefined` or omitted, an indeterminate pulsing bar is shown.
   * - If a number is provided, a filled bar with smooth transition and
   *   a percentage label is displayed.
   */
  progress?: number;
  /**
   * Current step description shown below the progress bar.
   * Useful for indicating which phase of a multi-step operation is running.
   */
  stepText?: string;
  /**
   * Icon component to render inside the header circle.
   * Defaults to the `Database` icon.
   */
  Icon?: IconComponent;
}

/**
 * A full-screen overlay that blocks user interaction and displays
 * the progress of a long-running operation.
 *
 * Features:
 * - Prevents browser back-navigation while active.
 * - Supports both indeterminate (pulsing) and determinate (percentage) modes.
 * - Smooth CSS transitions when `progress` updates.
 * - Customizable icon and multi-line text layout.
 *
 * @example
 * // Indeterminate mode
 * <ProcessingOverlay title="در حال حذف..." subtitle="لطفاً صبر کنید" />
 *
 * @example
 * // Determinate mode with step tracking
 * <ProcessingOverlay
 *   title="در حال بازیابی اطلاعات"
 *   progress={40}
 *   stepText="در حال ارسال اطلاعات به سرور..."
 * />
 */
export default function ProcessingOverlay({
  title,
  subtitle,
  progress,
  stepText,
  Icon = Database,
}: ProcessingOverlayProps) {
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
      window.history.forward();
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  const isIndeterminate = progress === undefined;
  const clampedProgress = isIndeterminate
    ? 0
    : Math.max(0, Math.min(100, progress));

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-7.5 z-50 animate-fade-in">
      <div className="w-full max-w-md flex flex-col items-center gap-10">
        <div className="h-16 w-16 rounded-4xl bg-primary-background border border-primary-border grid place-content-center">
          <Icon height={35} width={35} className="fill-primary animate-pulse" />
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold mb-2">{title}</h1>
          {subtitle && <p className="text-secondary text-sm">{subtitle}</p>}
        </div>

        <div className="w-full bg-elements-background rounded-2xl h-3 overflow-hidden">
          {isIndeterminate ? (
            <div className="bg-primary h-full rounded-2xl w-1/3 animate-pulse" />
          ) : (
            <div
              className="bg-primary h-full rounded-2xl transition-all duration-300 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          )}
        </div>

        {(!isIndeterminate || stepText) && (
          <div className="w-full flex items-center justify-between gap-4 min-h-4">
            <p className="text-xs text-secondary transition-all">
              {stepText ?? ""}
            </p>
            {!isIndeterminate && (
              <p className="text-xs text-secondary font-bold tabular-nums">
                {clampedProgress.toLocaleString("fa-IR")}٪
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
