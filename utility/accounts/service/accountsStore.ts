"use client";

import { AccountType } from "@/utility/accounts/types";
import { putItem, deleteItem, clearStore } from "@/utility/db/Database";

class AccountsStore {
  private accounts: AccountType[] = [];
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getAccounts(): AccountType[] {
    return [...this.accounts].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  setAccounts(data: AccountType[]) {
    this.accounts = [...data];
    this.notify();
  }

  async addAccount(account: AccountType) {
    const maxOrder = this.accounts.reduce(
      (max, a) => Math.max(max, a.order || 0),
      0,
    );
    const newAccount = { ...account, order: maxOrder + 1 };

    this.accounts.push(newAccount);
    this.notify();
    await putItem("accounts", newAccount);
  }

  async updateAccount(updatedAccount: AccountType) {
    const index = this.accounts.findIndex(
      (acc) => acc.id === updatedAccount.id,
    );
    if (index !== -1) {
      this.accounts[index] = { ...updatedAccount };
      this.notify();
      await putItem("accounts", updatedAccount);
    }
  }

  async reorderAccounts(newAccounts: AccountType[]) {
    this.accounts = newAccounts.map((acc, index) => ({
      ...acc,
      order: index + 1,
    }));
    this.notify();
    for (const acc of this.accounts) {
      await putItem("accounts", acc);
    }
  }

  async removeAccount(id: number) {
    this.accounts = this.accounts.filter((acc) => acc.id !== id);
    this.notify();
    await deleteItem("accounts", id);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.accounts;

  async clear() {
    this.accounts = [];
    this.notify();
    await clearStore("accounts");
  }
}

export const accountsStore = new AccountsStore();
export default accountsStore;
