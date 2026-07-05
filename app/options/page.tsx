import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import { PrimaryColors } from "@/features/colors";
import Database from "@/icons/Database";
import Forbidden from "@/icons/Forbidden";
import Restart from "@/icons/Restart";
import Tag from "@/icons/Tag";

type OptionsParamsType = { searchParams: Promise<{ redirect: string }> };

export default async function Options({ searchParams }: OptionsParamsType) {
  const { redirect } = await searchParams;

  const items = [
    { name: "برچسب‌ها", color: PrimaryColors.primary, Icon: Tag, link: "/" },
    {
      name: "پشتیبان‌گیری و بازیابی",
      color: PrimaryColors.primary,
      Icon: Database,
      link: "/",
    },
    {
      name: "حذف همه داده‌ها",
      color: PrimaryColors.red,
      Icon: Forbidden,
      link: "/",
    },
    {
      name: "بارگذاری مجدد",
      color: PrimaryColors.primary,
      Icon: Restart,
      link: "/",
    },
  ];

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="امکانات" redirect={redirect} />
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const { name, color, Icon, link } = item;

          return (
            <ListElement
              key={items.indexOf(item)}
              color={color}
              Icon={Icon}
              link={link}
            >
              {name}
            </ListElement>
          );
        })}
      </div>
    </div>
  );
}
