import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { TagType } from "@/utility/shared/tagTypes";

export type BackupType = {
  time: string;
  accounts: AccountType[];
  transactions: TransactionType[];
  tags: TagType[];
};

export async function getBackup(
  accounts: AccountType[],
  transactions: TransactionType[],
  tags: TagType[],
) {
  const backupData: BackupType = {
    time: new Date().toISOString(),
    accounts,
    transactions,
    tags,
  };

  const dataStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([dataStr], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pocket-backup-${new Date().toLocaleDateString("fa-IR")}.pbak`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
