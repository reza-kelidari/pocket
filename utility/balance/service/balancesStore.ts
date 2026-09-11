"use client";
import { AccountBalanceType, BalanceType } from "../types";

function isSameHistory(
  a: BalanceType[] | undefined,
  b: BalanceType[] | undefined,
): boolean {
  if (a === b) return true;
  const arrA = a ?? [];
  const arrB = b ?? [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i].time !== arrB[i].time || arrA[i].balance !== arrB[i].balance) {
      return false;
    }
  }
  return true;
}

function isSameBalances(
  a: AccountBalanceType[],
  b: AccountBalanceType[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if (!isSameHistory(a[i].history, b[i].history)) return false;
  }
  return true;
}

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
    if (isSameBalances(this.balances, data)) {
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
    return () => {
      this.listeners.delete(listener);
    };
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
