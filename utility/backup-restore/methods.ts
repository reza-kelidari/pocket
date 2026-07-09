import { AccountType } from "../accounts/types";
import { getAccountBalances } from "../shared/balancesMethods";
import { TransactionType } from "../transactions/types";

export type BackupType = {
  time: string;
  accounts: AccountType[];
  transactions: TransactionType[];
};

export function getBackup(
  accounts: AccountType[],
  transactions: TransactionType[],
): void {
  const currentDate = new Date();

  const backupData: BackupType = {
    time: currentDate.toISOString(),
    accounts,
    transactions,
  };

  const backup = JSON.stringify(backupData);

  const blob = new Blob([backup], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const aTag = document.createElement("a");

  const fileName = `pocket-${currentDate.toLocaleDateString("fa-IR").replaceAll("/", "-")}.pbak`;
  aTag.download = fileName;
  aTag.href = url;

  document.body.appendChild(aTag);
  aTag.click();
  document.body.removeChild(aTag);

  URL.revokeObjectURL(url);
}

type SetAccountsFn = (accounts: AccountType[]) => void;
type SetTransactionsFn = (transactions: TransactionType[]) => void;
type SetBalancesFn = (balances: any[]) => void;

export function restoreBackup(
  backup: BackupType,
  setAccounts: SetAccountsFn,
  setTransactions: SetTransactionsFn,
  setBalances: SetBalancesFn,
): void {
  setAccounts(backup.accounts);
  setTransactions(backup.transactions);

  setBalances(getAccountBalances(backup.accounts, backup.transactions));
}
