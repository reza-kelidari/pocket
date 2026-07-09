"use client";

import { MessageType } from "@/app/message/page";
import Box from "@/components/Box";
import Button from "@/components/Button";
import Description from "@/components/Description";
import NavbarTitle from "@/components/NavbarTitle";
import { useAccounts } from "@/utility/accounts/service/useAccounts";
import {
  BackupType,
  getBackup,
  restoreBackup,
} from "@/utility/backup-restore/methods";
import useBalances from "@/utility/balance/service/useBalances";
import useTransactions from "@/utility/transactions/service/useTransactions";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";

export default function Page() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [backupData, setBackupData] = useState<BackupType>();

  const { getAccounts, setAccounts } = useAccounts();
  const { getTransactions, setTransactions } = useTransactions();
  const { setBalances } = useBalances();

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
      restoreBackup(backupData, setAccounts, setTransactions, setBalances);

      const message: MessageType = {
        title: "بازیابی موفق",
        type: "done",
        message: `اطلاعات ${backupData.accounts.length.toLocaleString("fa-ir")} حساب با موفقیت بازیابی‌شد.`,
      };

      sessionStorage.setItem("message", JSON.stringify(message));

      router.replace("/message");
    }
  }

  useEffect(() => {
    if (getAccounts().length === 0) {
      router.replace(`/splash?from=/options/backup-restore`);
    }
  }, [getAccounts, router]);

  if (getAccounts().length === 0) return null;

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

          <Button onClick={() => getBackup(getAccounts(), getTransactions())}>
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
