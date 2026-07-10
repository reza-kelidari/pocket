"use client";

import ListElement from "@/components/ListElement";
import NavbarTitle from "@/components/NavbarTitle";
import Tag from "@/icons/Tag";
import { PrimaryColors } from "@/utility/colors";
import { getAll } from "@/utility/db/Database";
import { TagType } from "@/utility/tags/type";
import { TransactionType } from "@/utility/transactions/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CREATE_TRANSACTION_KEY } from "../page";

export default function TagSelector() {
  const [tags, setTags] = useState<TagType[]>([]);
  const [transaction, setTransaction] = useState<TransactionType>();
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const tagsInDB = await getAll<TagType>("tags");
      const data = sessionStorage.getItem(CREATE_TRANSACTION_KEY) ?? "";

      setTags(tagsInDB);
      setTransaction(JSON.parse(data) as TransactionType);
    };

    loadData();
  }, []);

  function handleSelect(id: number): void {
    try {
      const newData = JSON.stringify({ ...transaction, tag: id });
      sessionStorage.setItem(CREATE_TRANSACTION_KEY, newData);
    } catch (e) {}

    router.back();
  }

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="انتخاب دسته‌بندی" />
      </div>
      <div className="grid gap-4">
        {
          <ListElement
            iconColor={PrimaryColors.primary}
            Icon={Tag}
            href={"#"}
            onClick={() => handleSelect(0)}
            key={0}
          >
            حذف برچسب
          </ListElement>
        }
        {tags.map((item) => (
          <ListElement
            iconColor={PrimaryColors.primary}
            Icon={Tag}
            href={"#"}
            onClick={() => handleSelect(item.id)}
            key={item.id}
          >
            {item.name}
          </ListElement>
        ))}
      </div>
    </div>
  );
}
