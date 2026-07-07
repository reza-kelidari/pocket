"use client";

import { AccountColors, PrimaryColors } from "@/utility/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps } from "react";
import { AccountColorType } from "@/utility/accounts/types";

type CapsulePropsType = ComponentProps<"a"> & {
  Icon: IconComponent;
  children: React.ReactNode;
  href?: string;
  primary?: boolean;
  accountColor?: AccountColorType;
  replace?: boolean;
};

export default function Capsule({
  onClick,
  Icon,
  children,
  href,
  primary,
  accountColor,
  replace,
  ...props
}: CapsulePropsType) {
  const router = useRouter();

  const className = `${props.className ? props.className : primary ? PrimaryColors.primary.box : PrimaryColors.secondary.box} border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (e.defaultPrevented || !href || href === "#") {
      return;
    }

    if (replace) {
      e.preventDefault();
      router.replace(href);
    }
  };

  return (
    <Link
      {...props}
      href={href ?? "#"}
      className={className}
      onClick={handleClick}
    >
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
