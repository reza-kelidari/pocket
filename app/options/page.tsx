import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Reload from "@/components/Reload";
import { PrimaryColors } from "@/features/colors";
import Database from "@/icons/Database";
import Forbidden from "@/icons/Forbidden";
import Tag from "@/icons/Tag";

export default async function Options() {
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
  ];

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="امکانات" redirect="/">
          <Reload />
        </NavbarTitle>
      </div>

      <div className="grid gap-4">
        {items.map((item) => {
          const { name, color, Icon, link } = item;

          return (
            <ListElement
              key={items.indexOf(item)}
              iconColor={color}
              Icon={<Icon height={17} width={17} fill="#fff" />}
              href={link}
            >
              {name}
            </ListElement>
          );
        })}
      </div>
    </div>
  );
}
