import Box from "@/components/Box";
import Button from "@/components/Button";
import Description from "@/components/Description";
import NavbarTitle from "@/components/NavbarTitle";

export default function DeleteAll() {
  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="حذف همه‌ی اطلاعات" />
      </div>

      <div className="grid gap-10">
        <Box className="gap-5">
          <h1 className="text-sm text-center">حذف همه‌ی اطلاعات</h1>

          <Description className="[text-align-last:center]">
            در این‌بخش میتونین همه‌ی اطلاعاتی که در برنامه وارد کردین رو حذف
            کنین. اکیداً توصیه میشه قبل از این‌کار یه نسخه‌ی پشتیبان رو بارگیری
            کنین.
          </Description>

          <Button href="/options/backup-restore">بارگیری نسخه پشتیبان</Button>
          <Button red href="/options/delete-all/delete">
            حذف همه‌ی اطلاعات
          </Button>
        </Box>
      </div>
    </div>
  );
}
