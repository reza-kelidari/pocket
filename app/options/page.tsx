"use client";

import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Capsule from "../../components/Capsule";
import { PrimaryColors } from "@/utility/colors";
import Database from "@/icons/Database";
import Forbidden from "@/icons/Forbidden";
import Tag from "@/icons/Tag";
import Restart from "@/icons/Restart";

export default function Options() {
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
        <NavbarTitle title="امکانات">
          <Capsule Icon={Restart} onClick={() => window.location.reload()}>
            بارگذاری مجدد
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-4">
        {items.map((item, index) => {
          const { name, color, Icon, link } = item;

          return (
            <ListElement
              key={index}
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
