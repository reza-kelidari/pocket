"use client";

import { IconComponent } from "@/icons/types";
import { PrimaryColors, PrimaryColorsItemType } from "@/utility/colors";
import Link from "next/link";
import { ComponentProps } from "react";

type ListElementProps = ComponentProps<typeof Link> & {
  iconColor: PrimaryColorsItemType;
  Icon: IconComponent;
  desc?: string;
};

export default function ListElement({
  children,
  iconColor,
  Icon,
  desc,
  ...props
}: ListElementProps) {
  return (
    <Link className="w-ful relative text-sm" {...props}>
      <div
        className={`${PrimaryColors.secondary.box} p-4 flex items-center gap-2.5 w-full rounded-2xl`}
      >
        <div
          className={`h-7.5 w-7.5 ${iconColor.primary} rounded-4xl grid place-content-center`}
        >
          <Icon height={17} width={17} fill="#fff" />
        </div>

        <span
          className={iconColor !== PrimaryColors.primary ? iconColor.text : ""}
        >
          {children}
        </span>
      </div>
      <span className="absolute -translate-y-1/2 top-1/2 left-4 text-xs text-secondary">
        {desc}
      </span>
    </Link>
  );
}
