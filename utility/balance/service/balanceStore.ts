"use client";

import { AccountBalanceType } from "../types";

class BalancesStore {
  private balances: AccountBalanceType[] = [];
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getBalances(): AccountBalanceType[] {
    return [...this.balances];
  }

  setBalances(data: AccountBalanceType[]) {
    this.balances = [...data];
    this.notify();
  }

  addBalance(balance: AccountBalanceType) {
    this.balances.push(balance);
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.balances;
}

export const balancesStore = new BalancesStore();
export default balancesStore;
