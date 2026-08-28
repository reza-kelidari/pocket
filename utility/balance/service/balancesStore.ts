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
    if (
      this.balances.length === data.length &&
      this.balances.every((b, i) => b.id === data[i].id)
    ) {
      return;
    }
    this.balances = [...data];
    this.notify();
  }

  addBalance(balance: AccountBalanceType) {
    this.balances.push(balance);
    this.notify();
  }

  updateBalance(updatedBalance: AccountBalanceType) {
    const index = this.balances.findIndex((b) => b.id === updatedBalance.id);
    if (index !== -1) {
      this.balances[index] = { ...updatedBalance };
      this.notify();
    } else {
      this.addBalance(updatedBalance);
    }
  }

  removeBalance(id: string) {
    const newBalances = this.balances.filter((b) => b.id !== id);
    if (newBalances.length === this.balances.length) return;
    this.balances = newBalances;
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.balances;

  clear() {
    if (this.balances.length === 0) return;
    this.balances = [];
    this.notify();
  }
}

export const balancesStore = new BalancesStore();
export default balancesStore;
