"use client";

import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Capsule from "../../components/Capsule";
import { PrimaryColors } from "@/utility/colors";
import Database from "@/icons/Database";
import Forbidden from "@/icons/Forbidden";
import Tag from "@/icons/Tag";
import Restart from "@/icons/Restart";
import { usePathname } from "next/navigation";

export default function Options() {
  const pathname = usePathname();
  const items = [
    {
      name: "برچسب‌ها",
      color: PrimaryColors.primary,
      Icon: Tag,
      link: `${pathname}/tags`,
    },
    {
      name: "پشتیبان‌گیری و بازیابی",
      color: PrimaryColors.primary,
      Icon: Database,
      link: `${pathname}/backup-restore`,
    },
    {
      name: "حذف همه داده‌ها",
      color: PrimaryColors.red,
      Icon: Forbidden,
      link: `${pathname}/delete-all`,
    },
  ];

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="امکانات">
          <Capsule
            Icon={Restart}
            replace
            href="/"
            onClick={() => window.location.reload()}
          >
            بارگذاری مجدد
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-5">
        {items.map((item, index) => {
          const { name, color, Icon, link } = item;

          return (
            <ListElement
              key={index}
              iconColor={color}
              Icon={Icon}
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
