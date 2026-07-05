"use client";

import { AccountBalanceType } from "../types";

/**
 * In-memory storage for all loaded balances.
 *
 * This variable acts as the single source of truth for the balance store
 * during the application's runtime.
 */
let balances: AccountBalanceType[] = [];

/**
 * Registered listeners that are notified whenever the accounts data changes.
 */
const listeners = new Set<() => void>();

/**
 * A lightweight global store for managing accounts balances.
 *
 * Provides methods to:
 * - Read the current balances.
 * - Replace the balances collection.
 * - Subscribe to changes.
 *
 * This store follows a simple publish/subscribe (Pub/Sub) pattern and is
 * intended for client-side state sharing without an external state library.
 */
export const balancesStore = {
  /**
   * Returns the current list of balances.
   *
   * @returns The current accounts collection.
   */
  getBalances() {
    return balances;
  },

  /**
   * Replaces the current balances collection and notifies all subscribers.
   *
   * @param data The new balances collection.
   */
  setBalances(data: AccountBalanceType[]) {
    balances = data;

    listeners.forEach((listener) => listener());
  },

  /**
   * Registers a listener that will be called whenever the balances data changes.
   *
   * @param listener Callback invoked after {@link setAccounts} updates the store.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },
};
