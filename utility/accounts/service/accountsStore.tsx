"use client";

import { AccountType } from "@/utility/accounts/types";

/**
 * In-memory storage for all loaded accounts.
 *
 * This variable acts as the single source of truth for the accounts store
 * during the application's runtime.
 */
let accounts: AccountType[] = [];

/**
 * Registered listeners that are notified whenever the accounts data changes.
 */
const listeners = new Set<() => void>();

/**
 * A lightweight global store for managing account data.
 *
 * Provides methods to:
 * - Read the current accounts.
 * - Replace the accounts collection.
 * - Subscribe to changes.
 *
 * This store follows a simple publish/subscribe (Pub/Sub) pattern and is
 * intended for client-side state sharing without an external state library.
 */
export const accountsStore = {
  /**
   * Returns the current list of accounts.
   *
   * @returns The current accounts collection.
   */
  getAccounts() {
    return accounts;
  },

  /**
   * Replaces the current accounts collection and notifies all subscribers.
   *
   * @param data The new accounts collection.
   */
  setAccounts(data: AccountType[]) {
    accounts = data;

    listeners.forEach((listener) => listener());
  },

  /**
   * Registers a listener that will be called whenever the accounts data changes.
   *
   * @param listener Callback invoked after {@link setAccounts} updates the store.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};