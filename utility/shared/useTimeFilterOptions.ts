"use client";
import { useMemo } from "react";
import { timeFilters } from "@/app/transactions/methods";
import { toJalaliDateArray } from "./timeMethods";

export function useTimeFilterOptions() {
  return useMemo(() => timeFilters(toJalaliDateArray(new Date())), []);
}
