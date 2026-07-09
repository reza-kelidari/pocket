"use client";

import { TransactionType } from "@/utility/transactions/types";
import { putItem, deleteItem, clearStore } from "@/utility/db/Database";

class TransactionsStore {
  private transactions: TransactionType[] = [];
  private listeners: Set<() => void> = new Set();

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getTransactions(): TransactionType[] {
    return [...this.transactions];
  }

  setTransactions(data: TransactionType[]) {
    this.transactions = [...data].sort((a, b) => a.time - b.time);
    this.notify();
  }

  async addTransaction(transaction: TransactionType) {
    this.transactions.push(transaction);
    this.transactions.sort((a, b) => a.time - b.time);
    this.notify();
    await putItem("transactions", transaction);
  }

  async updateTransaction(updatedTransaction: TransactionType) {
    const index = this.transactions.findIndex(
      (t) => t.id === updatedTransaction.id,
    );
    if (index !== -1) {
      this.transactions[index] = { ...updatedTransaction };
      this.transactions.sort((a, b) => a.time - b.time);
      this.notify();
      await putItem("transactions", updatedTransaction);
    }
  }

  async removeTransaction(id: number) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.notify();
    await deleteItem("transactions", id);
  }

  async removeTransactionsByAccountID(accountID: number) {
    const toRemove = this.transactions.filter(
      (t) => t.debit === accountID || t.credit === accountID,
    );
    for (const t of toRemove) {
      await this.removeTransaction(t.id);
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.transactions;

  async clear() {
    this.transactions = [];
    this.notify();
    await clearStore("transactions");
  }
}

export const transactionsStore = new TransactionsStore();
export default transactionsStore;
