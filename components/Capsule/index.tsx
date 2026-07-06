"use client";

import { PrimaryColors } from "@/utility/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";

type CapsulePropsType = {
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLDivElement>;
  Icon: IconComponent;
  children: React.ReactNode;
  href?: string;
};

export default function Capsule({
  onClick,
  Icon,
  children,
  href,
}: CapsulePropsType) {
  const className = `${PrimaryColors.secondary.box} px-2 py-1 rounded-4xl text-xs flex items-center gap-1`;

  return (
    <Link href={href ?? "#"} className={className} onClick={onClick}>
      {children}
      <Icon height={15} width={15} />
    </Link>
  );
}
