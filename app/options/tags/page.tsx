"use client";

import Capsule from "@/components/Capsule";
import Description from "@/components/Description";
import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import Tag from "@/icons/Tag";
import { PrimaryColors } from "@/utility/colors";
import { getAll } from "@/utility/db/Database";
import { TagType } from "@/utility/tags/type";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Tags() {
  const pathname = usePathname();
  const [tags, setTags] = useState<TagType[]>();

  useEffect(() => {
    async function load() {
      setTags((await getAll("tags")) as TagType[]);
    }

    load();
  }, []);

  return (
    <div className="p-7.5 flex flex-col items-center gap-15 w-screen min-h-screen">
      <div className="flex flex-col justify-between gap-7.5 w-full">
        <NavbarTitle title="برچسب‌ها">
          <Capsule Icon={Left} href={`${pathname}/add`}>
            برچسب جدید
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="flex flex-col gap-5 h-100 w-full">
        {tags?.length ? (
          tags.map((item) => (
            <ListElement
              key={item.id}
              href="#"
              iconColor={PrimaryColors.primary}
              Icon={Tag}
            >
              {item.name}
            </ListElement>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-10 h-full">
            <Tag className="fill-secondary" height={75} width={75} />
            <Description>تا کنون هیچ برچسبی اضافه نکردین </Description>
          </div>
        )}
      </div>
    </div>
  );
}
