"use client";

import Capsule from "@/components/Capsule";
import Description from "@/components/Description";
import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import SwipeableAccountItem from "@/components/SwipableElement";
import Left from "@/icons/Left";
import Tag from "@/icons/Tag";
import { PrimaryColors } from "@/utility/colors";
import { deleteItem, getAll } from "@/utility/db/Database";
import { TagItemTypes } from "@/utility/shared/tagTypes";
import { TagType } from "@/utility/tags/type";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Tags() {
  const pathname = usePathname();
  const [tags, setTags] = useState<TagType[]>([]);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setTags(await getAll<TagType>("tags"));
    })();
  }, []);

  useEffect(() => {
    if (openItemId === null) return;
    const handleCloseAll = () => setOpenItemId(null);
    const timer = setTimeout(() => {
      window.addEventListener("mouseup", handleCloseAll);
      window.addEventListener("touchend", handleCloseAll);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mouseup", handleCloseAll);
      window.removeEventListener("touchend", handleCloseAll);
    };
  }, [openItemId]);

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
        {tags.length ? (
          tags.map((item) => (
            <SwipeableAccountItem
              key={item.id}
              isOpen={openItemId === item.id}
              onOpenChange={(open) => setOpenItemId(open ? item.id : null)}
              onCloseOthers={() => setOpenItemId(null)}
              onEdit={() => {
                router.push(`${pathname}/add?id=${item.id}`);
              }}
              onDelete={async () => {
                await deleteItem("tags", item.id);
                setTags((prev) => prev.filter((t) => t.id !== item.id));
              }}
            >
              <ListElement
                href="#"
                iconColor={PrimaryColors.primary}
                Icon={Tag}
                children={item.name}
                desc={
                  TagItemTypes.find((tag) => tag.value === item.type)?.label
                }
              />
            </SwipeableAccountItem>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-10 h-full">
            <Tag className="fill-secondary" height={75} width={75} />
            <Description>تا الان هیچ برچسبی اضافه نکردین.</Description>
          </div>
        )}
      </div>
    </div>
  );
}
