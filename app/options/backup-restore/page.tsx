"use client";

import { MessageType } from "@/app/message/page";
import Box from "@/components/Box";
import Button from "@/components/Button";
import Description from "@/components/Description";
import NavbarTitle from "@/components/NavbarTitle";
import { AccountType } from "@/utility/accounts/types";
import {
  BackupType,
  getBackup,
  restoreBackup,
} from "@/utility/backup-restore/methods";
import useBalances from "@/utility/balance/service/useBalances";
import { clearStore, getAll, putItem } from "@/utility/db/Database";
import { DatabaseStores } from "@/utility/keys/database";
import { TagType } from "@/utility/tags/type";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";

export default function Page() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [backupData, setBackupData] = useState<BackupType>();

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const { setBalances } = useBalances();
  const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

  useEffect(() => {
    (async () => {
      setAccounts((await getAll<AccountType>(accountsStore)));
      setTransactions((await getAll<TransactionType>(transactionsStore)));
      setTags((await getAll<TagType>(tagsStore)));
    })();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const result: BackupType = JSON.parse(fileReader.result as string);
        const backupTime = new Date(result.time).toLocaleDateString("fa-ir");

        setFileName("تاریخ نسخه پشتیبان: " + backupTime);
        setBackupData(result);
      };
      fileReader.readAsText(file);
    }
  }

  function handleFilePicker() {
    fileInputRef.current?.click();
  }

  function handleBackupRestore() {
    if (backupData) {
      restoreBackup(backupData, putItem, clearStore, setBalances);

      const message: MessageType = {
        title: "بازیابی موفق",
        type: "done",
        message: `اطلاعات ${backupData.accounts.length.toLocaleString("fa-ir")} حساب با موفقیت بازیابی‌شد.`,
      };

      sessionStorage.setItem("message", JSON.stringify(message));

      router.replace("/message");
    }
  }

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="پشتیبان‌گیری و بازیابی" />
      </div>

      <div className="grid gap-10">
        <Box className="gap-5">
          <h1 className="text-sm text-center">پشتیبان‌گیری از اطلاعات</h1>

          <Description className="[text-align-last:center]">
            باتوجه به این‌که اطلاعات در دستگاه به صورت محلی ذخیره میشه و در هیچ
            سرویس ابری‌ای پشتیبان گرفته نمیشه، توصیه میشه به صورت دوره‌ای نسخه
            پشتیبان تهیه کنین.
          </Description>

          <Description className="[text-align-last:center]">
            اطلاعاتی که در نسخه پشتیبان ذخیره میشه شامل{" "}
            <b className="text-primary">حساب‌ها</b>،{" "}
            <b className="text-primary">برچسب‌ها</b> و{" "}
            <b className="text-primary">تراکنش‌ها</b> هست.
          </Description>

          <Button onClick={() => getBackup(accounts, transactions, tags)}>
            بارگیری نسخه پشتیبان
          </Button>
        </Box>

        <Box className="gap-5">
          <h1 className="text-sm text-center">بازیابی اطلاعات</h1>
          <Description className="[text-align-last:center]">
            اگه یه نسخه پشتیبان دارید، میتونید اون‌رو بارگذاری کنید تا
            اطلاعات‌تون بازیابی بشه؛ درنظر داشته باشید که اگه تا الان اطلاعاتی
            رو در برنامه وارد کردین، این اطلاعات در ابتدا{" "}
            <b className="text-red">حذف</b> و سپس اطلاعات موجود در نسخه پشتیبان
            وارد برنامه میشه.
          </Description>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pbak"
            className="hidden"
            hidden
          />
          <Button secondary onClick={handleFilePicker}>
            {!!fileName ? fileName : "بارگذاری نسخه پشتیبان"}
          </Button>
          <Button disabled={!backupData} onClick={handleBackupRestore}>
            بازیابی اطلاعات
          </Button>
        </Box>
      </div>
    </div>
  );
}
