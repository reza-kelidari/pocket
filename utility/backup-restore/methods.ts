import { AccountType } from "../accounts/types";
import { clearStore, putItem } from "../db/Database";
import { DatabaseStores } from "../keys/database";
import { getAccountBalances } from "../shared/balancesMethods";
import { TagType } from "../tags/type";
import { TransactionType } from "../transactions/types";

export type BackupType = {
  time: string;
  accounts: AccountType[];
  transactions: TransactionType[];
  tags: TagType[];
};

export function getBackup(
  accounts: AccountType[],
  transactions: TransactionType[],
  tags: TagType[],
): void {
  const currentDate = new Date();

  const backupData: BackupType = {
    time: currentDate.toISOString(),
    accounts,
    transactions,
    tags,
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

type SetBalancesFn = (balances: any[]) => void;

export async function restoreBackup(
  backup: BackupType,
  put: typeof putItem,
  clear: typeof clearStore,
  setBalances: SetBalancesFn,
): Promise<void> {
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  clear(accountsStore);
  await put(accountsStore, backup.accounts);

  clear(transactionsStore);
  await put(transactionsStore, backup.transactions);

  clear(tagsStore);
  await put(tagsStore, backup.tags);

  setBalances(getAccountBalances(backup.accounts, backup.transactions));
}
