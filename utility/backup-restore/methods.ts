import { AccountType } from "../accounts/types";
import { clearStore, putItem } from "../db/Database";
import { DatabaseStores } from "../keys/database";
import { getAccountBalances } from "../shared/balancesMethods";
import { TagType } from "../shared/tagTypes";
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

  await clear(accountsStore);
  await clear(transactionsStore);
  await clear(tagsStore);

  if (backup.accounts && Array.isArray(backup.accounts)) {
    for (const acc of backup.accounts) {
      if (acc && acc.id) {
        await put(accountsStore, acc);
      }
    }
  }

  if (backup.transactions && Array.isArray(backup.transactions)) {
    for (const tx of backup.transactions) {
      if (tx && tx.id) {
        await put(transactionsStore, tx);
      }
    }
  }

  if (backup.tags && Array.isArray(backup.tags)) {
    for (const tag of backup.tags) {
      if (tag && tag.id) {
        await put(tagsStore, tag);
      }
    }
  }

  setBalances(
    getAccountBalances(backup.accounts || [], backup.transactions || []),
  );
}
