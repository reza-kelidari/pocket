/**
 * @fileoverview Account Details Page
 *
 * Displays comprehensive details for a specific account, including:
 * - Account metadata and an edit action.
 * - Balance history chart.
 * - For "Book" accounts: Tag-wise balance breakdown (default view).
 * - Transaction ledger with time-based filtering (when a tag is selected or non-Book account).
 * - Swipe actions for editing and deleting transactions.
 *
 * Route: `/accounts/[id]`
 *
 * URL Parameters:
 * - `time` (number): Time filter for the ledger (in days). Default: 29.
 * - `tag` (string): When present on a Book account, shows the ledger filtered
 *   by this tag. Use `"untagged"` for transactions without a tag.
 */
"use client";
import Left from "@/icons/Left";
import { JSX } from "react";
import { TimeWindowProps } from "../../page";

/**
 * TimeWindow Component
 *
 * Renders a dropdown button for selecting time-based filters on the account ledger.
 * Handles mount/unmount animations and click-outside-to-close behavior.
 *
 * @param props - Component props containing dropdown state and configuration.
 * @returns The rendered time filter dropdown UI.
 */
export function TimeWindow({
  dropdownRef, setShowTimeDropdown, currentTimeFilterName, isDropdownMounted, isDropdownVisible, timeFilterOptions, handleTimeFilterChange, timeFilter, accountColor,
}: TimeWindowProps): JSX.Element {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowTimeDropdown((v) => !v)}
        className={`border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap ${accountColor.surface} ${accountColor.border} ${accountColor.text} cursor-pointer`}
      >
        {currentTimeFilterName}
        <Left height={15} width={15} className="fill-current" />
      </button>
      {isDropdownMounted && (
        <div
          className={`absolute top-full left-0 mt-2 p-2 flex flex-col gap-1 bg-white border border-elements-border rounded-2xl shadow-lg z-50 min-w-36 transition-all duration-200 ease-out transform origin-top-left ${isDropdownVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"}`}
        >
          {timeFilterOptions.map((option) => (
            <button
              key={option.time}
              type="button"
              onClick={() => handleTimeFilterChange(option.time)}
              className={`block w-full text-right px-4 rounded-md py-2.5 text-xs transition-colors ${option.time === timeFilter
                  ? `${accountColor.text} font-bold ${accountColor.surface}`
                  : "text-black hover:bg-elements-background"}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
