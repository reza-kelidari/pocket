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

  updateBalance(updatedBalance: AccountBalanceType) {
    // فرض بر این است که فیلد شناسه حساب در موجودی‌ها accountId است
    const index = this.balances.findIndex(
      (b) => b.id === updatedBalance.id,
    );
    if (index !== -1) {
      this.balances[index] = { ...updatedBalance };
      this.notify();
    } else {
      // اگر موجودی قبلی برای این حساب ثبت نشده بود، آن را اضافه می‌کند
      this.addBalance(updatedBalance);
    }
  }

  removeBalance(id: number) {
    this.balances = this.balances.filter((b) => b.id !== id);
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.balances;

  clear() {
    this.balances = [];
    this.notify();
  }
}

export const balancesStore = new BalancesStore();
export default balancesStore;