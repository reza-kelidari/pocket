"use client";

import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Tag from "@/icons/Tag";
import { PrimaryColors } from "@/utility/shared/colors";
import { getAll } from "@/utility/db/Database";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionType } from "@/utility/shared/transactionTypes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";

export default function TagSelector() {
  const [tags, setTags] = useState<TagType[]>([]);
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY)!;

      const tx = JSON.parse(data) as TransactionType;
      setSelectedTag(tx.tag);

      setTags(await getAll<TagType>("tags"));
    })();
  }, [router]);

  function handleSelect(id: string): void {
    const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY);
    if (!data) {
      router.back();
      return;
    }

    try {
      const tx = JSON.parse(data) as TransactionType;
      const newData = JSON.stringify({ ...tx, tag: id });
      sessionStorage.setItem(CREATE_TRANSACTION_KEY, newData);
    } catch (e) {}

    router.back();
  }

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="انتخاب برچسب" />
      </div>

      <div className="grid gap-4">
        {!!selectedTag && selectedTag !== "" && (
          <ListElement
            iconColor={PrimaryColors.primary}
            Icon={Tag}
            href="٫"
            onClick={() => handleSelect("")}
          >
            حذف برچسب
          </ListElement>
        )}

        {tags.map((item) => (
          <ListElement
            iconColor={PrimaryColors.primary}
            Icon={Tag}
            primary={selectedTag === item.id}
            href="#"
            key={item.id}
            onClick={() => handleSelect(item.id)}
          >
            {item.name}
          </ListElement>
        ))}
      </div>
    </div>
  );
}
