import Box from "@/components/Box";
import Button from "@/components/Button";
import Title from "@/components/SectionTitle";
import { TagItemTypes } from "@/utility/shared/tagTypes";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import {
  excelColorOptions,
  PreviewData,
} from "@/utility/import/excelConstants";

interface PreviewSectionProps {
  previewData: PreviewData;
  isConfirmed: boolean;
  setIsConfirmed: (value: boolean) => void;
  isImporting: boolean;
  handleImport: () => void;
}

export default function PreviewSection({
  previewData,
  isConfirmed,
  setIsConfirmed,
  isImporting,
  handleImport,
}: PreviewSectionProps) {
  return (
    <div className="grid gap-10 w-full max-w-full min-w-0">
      <Title>بازبینی اطلاعات</Title>

      <Box>
        <div className="font-bold text-sm mb-2 text-black">خلاصه اطلاعات</div>
        <div className="grid gap-1 text-xs text-secondary">
          <div>
            تعداد تراکنش‌های ورودی:{" "}
            {previewData.rawTransactions.length.toLocaleString("fa-IR")}
          </div>
          <div>
            تعداد حساب‌های یافت شده:{" "}
            {previewData.accounts.length.toLocaleString("fa-IR")}
          </div>
          <div>
            تعداد برچسب‌های یافت شده:{" "}
            {previewData.tags.length.toLocaleString("fa-IR")}
          </div>
        </div>
      </Box>

      <Box className="min-w-0">
        <h3 className="text-sm font-bold mb-4">حساب‌ها</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-right whitespace-nowrap min-w-full">
            <thead>
              <tr>
                <th className="bg-primary text-white p-3">ردیف</th>
                <th className="bg-primary text-white p-3">نام حساب</th>
                <th className="bg-primary text-white p-3">نوع</th>
                <th className="bg-primary text-white p-3">رنگ</th>
                <th className="bg-primary text-white p-3">وضعیت</th>
                <th className="bg-primary text-white p-3">تعداد تراکنش‌ها</th>
                <th className="bg-primary text-white p-3">موجودی نهایی</th>
              </tr>
            </thead>
            <tbody>
              {previewData.accounts.map((acc, i) => (
                <tr key={i} className="border-t border-elements-border">
                  <td className="p-3">{acc.order}</td>
                  <td className="p-3">{acc.name}</td>
                  <td className="p-3">
                    {acc.default
                      ? "پیش‌فرض"
                      : (AccountTypes as any)[acc.type]?.name}
                  </td>
                  <td className="p-3">
                    {acc.default
                      ? "پیش‌فرض"
                      : excelColorOptions.find((c) => c.key === acc.color)
                          ?.label}
                  </td>
                  <td className="p-3">
                    {acc.isNew ? (
                      <span className="text-green-600 font-bold">جدید</span>
                    ) : acc.needsUpdate ? (
                      <span className="text-blue-600 font-bold">بروزرسانی</span>
                    ) : (
                      <span className="text-yellow-600 font-bold">موجود</span>
                    )}
                  </td>
                  <td className="p-3">{acc.txCount.toLocaleString("fa-IR")}</td>
                  <td className="p-3">
                    {acc.finalBalance.toLocaleString("fa-IR")} ﷼
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box className="min-w-0">
        <h3 className="text-sm font-bold mb-4">برچسب‌ها</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-right whitespace-nowrap min-w-full">
            <thead>
              <tr>
                <th className="bg-primary text-white p-3">ردیف</th>
                <th className="bg-primary text-white p-3">نام برچسب</th>
                <th className="bg-primary text-white p-3">نوع</th>
                <th className="bg-primary text-white p-3">وضعیت</th>
                <th className="bg-primary text-white p-3">تعداد استفاده</th>
              </tr>
            </thead>
            <tbody>
              {previewData.tags.map((tag, i) => (
                <tr key={i} className="border-t border-elements-border">
                  <td className="p-3">{tag.order}</td>
                  <td className="p-3">{tag.name}</td>
                  <td className="p-3">
                    {TagItemTypes.find((t) => t.value === tag.type)?.label}
                  </td>
                  <td className="p-3">
                    {tag.isNew ? (
                      <span className="text-green-600 font-bold">جدید</span>
                    ) : tag.needsUpdate ? (
                      <span className="text-blue-600 font-bold">بروزرسانی</span>
                    ) : (
                      <span className="text-yellow-600 font-bold">موجود</span>
                    )}
                  </td>
                  <td className="p-3">{tag.txCount.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <Box>
        <div className="grid gap-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="accent-primary p-3"
            />
            تایید می‌کنم که اطلاعات بررسی شد و می‌خواهم به دیتابیس فعلی اضافه
            شوند.
          </label>
          <Button
            secondary={!isConfirmed}
            disabled={!isConfirmed || isImporting}
            onClick={handleImport}
          >
            {isImporting ? "در حال وارد کردن..." : "ورود اطلاعات به برنامه"}
          </Button>
        </div>
      </Box>
    </div>
  );
}
