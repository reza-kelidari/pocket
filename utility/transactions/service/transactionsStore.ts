"use client";

import { TransactionType } from "../types";

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

  addTransaction(transaction: TransactionType) {
    this.transactions.push(transaction);
    this.transactions.sort((a, b) => a.time - b.time);
    this.notify();
  }

  updateTransaction(updatedTransaction: TransactionType) {
    const index = this.transactions.findIndex(
      (t) => t.id === updatedTransaction.id,
    );
    if (index !== -1) {
      this.transactions[index] = { ...updatedTransaction };
      this.transactions.sort((a, b) => a.time - b.time);
      this.notify();
    }
  }

  removeTransaction(id: number) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.transactions;

  clear() {
    this.transactions = [];
    this.notify();
  }
}

export const transactionsStore = new TransactionsStore();
export default transactionsStore;
