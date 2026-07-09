"use client";

import { generateNextTagId } from "@/utility/shared/idGenerationMethods";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { TagType } from "@/utility/tags/type";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { getAll, putItem } from "@/utility/db/Database";
import { useRouter } from "next/navigation";

export default function AddTag() {
  const [tagID, setTagID] = useState<number>(0);
  const [tagDetails, setTagDetails] = useState<TagType>({
    id: tagID,
    name: "",
    type: "Person",
  });
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setTagID(generateNextTagId((await getAll("tags")) as TagType[]));
    }

    load();
  }, []);

  const isValid = useMemo(() => {
    const nameValid = tagDetails.name.trim().length >= 3;

    return nameValid;
  }, [tagDetails]);

  function handleNameChange(e: ChangeEvent<HTMLInputElement>): void {
    setTagDetails({ ...tagDetails, name: e.target.value });
  }

  async function handleSave() {
    if (isValid) {
      await putItem("tags", tagDetails);

      router.back();
    }
  }

  return (
    <div className="p-7.5 grid gap-15">
      <div className="grid gap-7.5">
        <NavbarTitle title="برچسب جدید">
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره برچسب
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className="text-xs">نام برچسب</span>
          <input
            type="text"
            onChange={handleNameChange}
            placeholder="شرکت فلان"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
          />
        </div>
      </div>
    </div>
  );
}
