"use client";

import AccountsListElement from "@/components/AccountsListElement";
import NavbarTitle from "@/components/NavbarTitle";
import useBalances from "@/utility/balance/service/useBalances";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { AccountType } from "@/utility/accounts/types";
import { getAll } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import AccountSelectorSkeleton from "@/components/AccountSelectorSkeleton";

/**
 * The main component for selecting an account during transaction creation or editing.
 * Handles logic for preventing duplicate account selection in transfers and enforcing sequential selection.
 *
 * @returns The rendered account selector page.
 */
export default function AccountSelector() {
  const { getBalances } = useBalances();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accountsStore } = DatabaseStores;

  const accountParam = searchParams.get("type") as
    | "toAccount"
    | "fromAccount"
    | null;

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Hydration-safe initialization. Starts as null to match server render.
   */
  const [draftTransaction, setDraftTransaction] =
    useState<TransactionType | null>(null);

  /**
   * Safely loads the draft transaction from session storage on the client side
   * to prevent server/client hydration mismatches.
   */
  useEffect(() => {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) return;
    try {
      setDraftTransaction(JSON.parse(data) as TransactionType);
    } catch {
      // Ignore parsing errors
    }
  }, []);

  const transactionType = draftTransaction?.type ?? null;

  /**
   * Prevents accessing the destination account selector before selecting the source account.
   */
  useEffect(() => {
    if (
      transactionType === "transfer" &&
      accountParam === "toAccount" &&
      !draftTransaction?.credit
    ) {
      router.back();
    }
  }, [transactionType, accountParam, draftTransaction, router]);

  /**
   * Determines the currently selected account ID for the active side.
   */
  const selectedId = (() => {
    if (!draftTransaction) return "";

    if (accountParam === "fromAccount") {
      return draftTransaction.credit || "";
    }

    return draftTransaction.type === "credit"
      ? draftTransaction.credit || ""
      : draftTransaction.debit || "";
  })();

  /**
   * Determines the account ID selected on the opposite side (used for transfers).
   * This prevents users from selecting the same account for both source and destination.
   */
  const otherSelectedId = (() => {
    if (!draftTransaction || draftTransaction.type !== "transfer") return "";
    if (accountParam === "fromAccount") {
      return draftTransaction.debit || "";
    }
    if (accountParam === "toAccount") {
      return draftTransaction.credit || "";
    }
    return "";
  })();

  /**
   * Loads all available accounts from the database on mount.
   */
  useEffect(() => {
    (async () => {
      try {
        setAccounts(await getAll<AccountType>(accountsStore));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accountsStore]);

  /**
   * Handles the selection of an account and updates the transaction draft.
   *
   * @param id - The ID of the selected account.
   */
  function handleSelect(id: string): void {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);

    if (!data) {
      router.back();
      return;
    }

    try {
      const currentTransaction = JSON.parse(data) as TransactionType;
      let update: Partial<TransactionType> = {};

      if (currentTransaction.type === "transfer") {
        update =
          accountParam === "fromAccount" ? { credit: id } : { debit: id };
      } else if (currentTransaction.type === "debit") {
        update = { debit: id };
      } else if (currentTransaction.type === "credit") {
        update = { credit: id };
      }

      const newData = JSON.stringify({ ...currentTransaction, ...update });
      sessionStorage.setItem(CREATE_TRANSACTION_KEY, newData);
    } catch {
      // Ignore parsing errors
    }

    router.back();
  }

  /**
   * Determines the appropriate navbar title based on the transaction type and account side.
   */
  let navbarTitle = "انتخاب حساب";

  if (
    transactionType === "debit" ||
    (transactionType === "transfer" && accountParam === "toAccount")
  ) {
    navbarTitle = "حساب مقصد";
  } else if (
    transactionType === "credit" ||
    (transactionType === "transfer" && accountParam === "fromAccount")
  ) {
    navbarTitle = "حساب مبدأ";
  }

  const visibleAccounts = accounts.filter(
    (item) => transactionType === "transfer" || !item.hidden,
  );

  const balancesCount = getBalances().length;

  const skeletonCount =
    transactionType === "transfer"
      ? Math.max(balancesCount, 4)
      : Math.max(balancesCount - 1, 3);

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title={navbarTitle} disabled />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <AccountSelectorSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 animate-fade-in">
          {visibleAccounts.map((item) => {
            const isSelected = selectedId === item.id;
            const isOtherSelected = otherSelectedId === item.id;
            const isDisabled = isOtherSelected;

            return (
              <AccountsListElement
                key={item.id}
                onClick={(e) => {
                  if (isDisabled) {
                    e?.preventDefault();
                    return;
                  }
                  handleSelect(item.id);
                }}
                account={item}
                balances={getBalances()}
                desaturated={(!!selectedId && !isSelected) || isDisabled}
                disabled={isDisabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
