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
          <h1 className="text-sm text-red">حذف همه‌ی اطلاعات</h1>

          <Description>
            در این‌بخش میتونین <span className="text-red">همه‌ی</span> اطلاعاتی
            که در برنامه وارد کردین رو <span className="text-red">حذف</span>{" "}
            کنین. اکیداً توصیه میشه قبل از این‌کار یه نسخه‌ی{" "}
            <span className="text-primary">پشتیبان</span> رو بارگیری کنین.
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
