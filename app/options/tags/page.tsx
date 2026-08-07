"use client";

import Capsule from "@/components/Capsule";
import Description from "@/components/Description";
import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import SwipeableElement from "@/components/SwipeableElement";
import Left from "@/icons/Left";
import Tag from "@/icons/Tag";
import { PrimaryColors } from "@/utility/shared/colors";
import { getAll } from "@/utility/db/Database";
import { TagItemTypes } from "@/utility/shared/tagTypes";
import { TagType } from "@/utility/shared/tagTypes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Tags() {
  const pathname = usePathname();
  const [tags, setTags] = useState<TagType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setTags(await getAll<TagType>("tags"));
      } catch (error) {
        console.error("Failed to load tags:", error);
      } finally {
        setIsLoading(false);
      }
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
    <div className="p-7.5 flex flex-col items-center gap-15 w-screen min-h-screen animate-fade-in">
      <div className="flex flex-col justify-between gap-7.5 w-full">
        <NavbarTitle title="برچسب‌ها">
          <Capsule Icon={Left} href={`${pathname}/add`}>
            برچسب جدید
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="flex flex-col gap-5 min-h-100 w-full">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full p-4 flex items-center gap-2.5 rounded-2xl border border-elements-border bg-elements-background animate-pulse"
              >
                <div className="h-7.5 w-7.5 rounded-4xl bg-elements-border shrink-0"></div>
                <div className="grid gap-2 w-full">
                  <div className="h-4 w-24 rounded-md bg-elements-border"></div>
                  <div className="h-3 w-16 rounded-md bg-elements-border"></div>
                </div>
              </div>
            ))}
          </>
        ) : tags.length ? (
          tags.map((item) => (
            <SwipeableElement
              key={item.id}
              isOpen={openItemId === item.id}
              onOpenChange={(open) => setOpenItemId(open ? item.id : null)}
              onCloseOthers={() => setOpenItemId(null)}
              onEdit={() => {
                router.push(`${pathname}/add?id=${item.id}`);
              }}
              onDelete={async () => {
                router.push(`${pathname}/delete?id=${item.id}`);
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
            </SwipeableElement>
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
