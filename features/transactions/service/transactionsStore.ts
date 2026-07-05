"use client";

import { TransactionType } from "../types";

/**
 * In-memory storage for all loaded transactions.
 *
 * This variable acts as the single source of truth for the transactions store
 * during the application's runtime.
 */
let transactions: TransactionType[] = [];

/**
 * Registered listeners that are notified whenever the transactions data changes.
 */
const listeners = new Set<() => void>();

/**
 * A lightweight global store for managing transaction data.
 *
 * Provides methods to:
 * - Read the current transactions.
 * - Replace the transactions collection.
 * - Subscribe to changes.
 *
 * Transactions are automatically sorted by time whenever they are updated.
 *
 * This store follows a simple publish/subscribe (Pub/Sub) pattern and is
 * intended for client-side state sharing without an external state library.
 */
export const transactionsStore = {
  /**
   * Returns the current list of transactions.
   *
   * @returns The current transactions collection.
   */
  getTransactions() {
    return transactions;
  },

  /**
   * Replaces the current transactions collection.
   *
   * The provided transactions are sorted chronologically before being stored,
   * then all registered subscribers are notified.
   *
   * @param data The new transactions collection.
   */
  setTransactions(data: TransactionType[]) {
    transactions = [...data].sort((a, b) => a.time - b.time);

    listeners.forEach((listener) => listener());
  },

  /**
   * Registers a listener that will be called whenever the transactions data changes.
   *
   * @param listener Callback invoked after {@link setTransactions} updates the store.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};