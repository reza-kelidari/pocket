"use client";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountColorType, AccountType } from "@/utility/accounts/types";
import { AccountColors } from "@/utility/shared/colors";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AccountFormValues = {
  name: string;
  type: AccountType["type"];
  color: AccountColorType;
  initialBalance: number;
  createTimestamp: number;
};

type AccountFormProps = {
  values: AccountFormValues;
  createInput: string;
  isValid: boolean;
  isDefault?: boolean;
  isEditMode?: boolean;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInitialBalanceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorChange: (color: AccountColorType) => void;
};

export default function AccountForm({
  values,
  createInput,
  isValid,
  isDefault = false,
  isEditMode = false,
  onNameChange,
  onInitialBalanceChange,
  onCreateChange,
  onColorChange,
}: AccountFormProps) {
  const pathname = usePathname();

  return (
    <div className="grid gap-10">
      <div className="grid gap-2">
        <span className="text-xs">نام حساب</span>
        <input
          type="text"
          value={values.name}
          onChange={onNameChange}
          placeholder="بانک فلان"
          className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
        />
      </div>
      <div className="grid gap-2">
        <span className="text-xs">نوع حساب</span>
        <Link
          href={
            isEditMode && isDefault
              ? "#"
              : isEditMode
                ? `/accounts/add/type`
                : `${pathname}/type`
          }
          className="flex items-center justify-between h-12 w-full border border-elements-border bg-elements-background px-4 rounded-2xl text-sm active:bg-elements-background/70 transition-colors"
        >
          <span className={isDefault && isEditMode ? "text-secondary" : ""}>
            {AccountTypes[values.type].name}
          </span>
          {!(isDefault && isEditMode) && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 30 30"
              className="fill-secondary"
            >
              <path d="M19.1617398,21.4820467 L13.8624473,16.337402 C13.7136447,16.1980593 13.5950688,16.0296691 13.5138817,15.8423018 C13.4328173,15.6553972 13.3910245,15.4539359 13.3910245,15.249999 C13.3910245,15.0459295 13.4328702,14.8441716 13.5140102,14.6570926 C13.5949586,14.4703305 13.713508,14.3020674 13.8657255,14.1594989 L13.8796889,14.1461566 L19.1617398,9.01795188 C19.6849961,8.50993611 19.6973509,7.67392496 19.1893352,7.15066872 C18.6813194,6.62741247 17.8453082,6.61505763 17.322052,7.12307341 L12.045121,12.2463774 C11.638015,12.6305674 11.3133541,13.0933506 11.0909366,13.6065071 C10.8660377,14.1250408 10.749999,14.6844839 10.749999,15.249999 C10.749999,15.8153929 10.8659893,16.3745386 11.0907524,16.8927589 C11.3134143,17.4066286 11.6382273,17.8696734 12.0401604,18.2485323 L17.322052,23.3769252 C17.8453082,23.884941 18.6813194,23.8725862 19.1893352,23.3493299 C19.6973509,22.8260737 19.6849961,21.9900625 19.1617398,21.4820467 Z" />
            </svg>
          )}
        </Link>
      </div>
      <div className="grid gap-2">
        <span className="text-xs">موجودی اولیه</span>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={
              values.initialBalance
                ? values.initialBalance.toLocaleString("fa-IR")
                : ""
            }
            onChange={onInitialBalanceChange}
            placeholder="۰"
            className="h-12 w-full text-sm border border-elements-border bg-elements-background px-4 pl-10 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-[10px] pointer-events-none">
            ﷼
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-xs">تاریخ افتتاح حساب</span>
        <input
          type="text"
          inputMode="numeric"
          value={createInput}
          onChange={onCreateChange}
          placeholder="۱۴۰۵/۰۱/۰۱"
          className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
        />
      </div>
      {!isDefault && (
        <div className="grid gap-2">
          <span className="text-xs">رنگ حساب</span>
          <div className="grid grid-cols-4 gap-7.5 w-full p-5">
            {Object.entries(AccountColors).map(([key, color]) => (
              <button
                type="button"
                key={key}
                onClick={() => onColorChange(key as AccountColorType)}
                aria-label={`انتخاب رنگ ${key}`}
                className={`${color.primary} h-11 w-11 rounded-3xl cursor-pointer transition-all duration-200 justify-self-center border-4 border-transparent ${
                  values.color === key
                    ? "scale-90 border-white/50 shadow-2xl"
                    : ""
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
