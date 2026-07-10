"use client";

import { generateNextTagId } from "@/utility/shared/idGenerationMethods";
import Capsule from "@/components/Capsule";
import NavbarTitle from "@/components/NavbarTitle";
import Left from "@/icons/Left";
import { TagType } from "@/utility/tags/type";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { getAll, putItem } from "@/utility/db/Database";
import { useRouter, useSearchParams } from "next/navigation";
import { TagItemTypes } from "@/utility/shared/tagTypes";

export default function AddTag() {
  const router = useRouter();
  const [tagDetails, setTagDetails] = useState<TagType>({
    id: 0,
    name: "",
    type: "Person",
  });
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  useEffect(() => {
    (async () => {
      if (!!id) {
        const tagInDB = (await getAll<TagType>("tags")).find(
          (item) => item.id === id,
        );
        setTagDetails(tagInDB!);
      } else {
        const nextId = generateNextTagId(await getAll<TagType>("tags"));
        setTagDetails((prev) => ({ ...prev, id: nextId }));
      }
    })();
  }, []);

  const isValid = useMemo(() => {
    return tagDetails.name.trim().length >= 3;
  }, [tagDetails.name]);

  function handleNameChange(e: ChangeEvent<HTMLInputElement>): void {
    setTagDetails((prevTag) => ({ ...prevTag, name: e.target.value }));
  }

  async function handleSave() {
    if (isValid) {
      await putItem("tags", tagDetails);
      router.back();
    }
  }

  return (
    <div className="p-7.5 flex flex-col gap-15">
      <div className="flex flex-col gap-7.5">
        <NavbarTitle title="برچسب جدید">
          <Capsule Icon={Left} primary={isValid} onClick={handleSave}>
            ذخیره برچسب
          </Capsule>
        </NavbarTitle>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs">نام برچسب</span>
          <input
            type="text"
            onChange={handleNameChange}
            placeholder="شرکت فلان"
            className="h-12 text-sm border border-elements-border bg-elements-background px-4 rounded-2xl outline-none focus:bg-primary-background focus:border-primary-border transition-all"
            value={tagDetails.name}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs">نوع برچسب</span>
          <div className="bg-elements-border/75 flex w-fit mx-auto gap-2 p-2 rounded-2xl">
            {TagItemTypes.map((item) => (
              <div
                key={item.value}
                className={`text-xs py-2 px-4 rounded-xl transition-all ${item.value === tagDetails.type ? "bg-primary text-white" : "bg-white"}`}
                onClick={() =>
                  setTagDetails((prevTag) => ({ ...prevTag, type: item.value }))
                }
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
