import { AccountType } from "@/utility/accounts/types";

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

  addAccount(account: AccountType) {
    this.accounts.push(account);
    this.notify();
  }

  updateAccount(updatedAccount: AccountType) {
    const index = this.accounts.findIndex((acc) => acc.id === updatedAccount.id);
    if (index !== -1) {
      this.accounts[index] = { ...updatedAccount };
      this.notify();
    }
  }

  removeAccount(id: number) {
    this.accounts = this.accounts.filter((acc) => acc.id !== id);
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.accounts;

  clear() {
    this.accounts = [];
    this.notify();
  }
}

export const accountsStore = new AccountsStore();
export default accountsStore;