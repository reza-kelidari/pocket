"use client";

import { PrimaryColors } from "@/features/colors";
import Restart from "@/icons/Restart";

export default function Reload() {
  return (
    <div
      className={`${PrimaryColors.secondary.box} px-2 py-1 rounded-4xl text-xs flex items-center gap-1`}
      onClick={() => {
        window.location.assign("/")
      }}
    >
      بارگذاری مجدد
      <Restart height={15} width={15} />
    </div>
  );
}
