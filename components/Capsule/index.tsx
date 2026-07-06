"use client";

import { AccountColors, PrimaryColors } from "@/utility/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";
import { ComponentProps } from "react";
import { AccountColorType } from "@/utility/accounts/types";

type CapsulePropsType = ComponentProps<"a"> & {
  Icon: IconComponent;
  children: React.ReactNode;
  href?: string;
  primary?: boolean;
  accountColor?: AccountColorType;
};

export default function Capsule({
  onClick,
  Icon,
  children,
  href,
  primary,
  accountColor,
  ...props
}: CapsulePropsType) {
  const className = `${props.className ? props.className : primary ? PrimaryColors.primary.box : PrimaryColors.secondary.box} border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap`;
  return (
    <Link {...props} href={href ?? "#"} className={className} onClick={onClick}>
      {children}
      <Icon
        height={15}
        width={15}
        fill={accountColor ? AccountColors[accountColor].primaryValue : ""}
        className={!props.className && primary ? "fill-primary" : ""}
      />
    </Link>
  );
}
