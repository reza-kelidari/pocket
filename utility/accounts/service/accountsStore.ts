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
    return [...this.accounts];
  }

  setAccounts(data: AccountType[]) {
    this.accounts = [...data];
    this.notify();
  }

  async addAccount(account: AccountType) {
    this.accounts.push(account);
    this.notify();
    await putItem("accounts", account);
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
