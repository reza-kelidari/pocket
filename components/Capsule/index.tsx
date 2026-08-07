"use client";

import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ComponentProps,
  MouseEvent as ReactMouseEvent,
  MouseEventHandler,
} from "react";
import type { AccountColorType } from "@/utility/accounts/types";

type CapsulePropsType = Omit<ComponentProps<"a">, "onClick"> & {
  Icon: IconComponent;
  children: React.ReactNode;
  href?: string;
  primary?: boolean;
  accountColor?: AccountColorType;
  replace?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
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

  const className = `${
    props.className
      ? props.className
      : primary
        ? PrimaryColors.primary.box
        : PrimaryColors.secondary.box
  } border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap`;

  const content = (
    <>
      {children}
      <Icon
        height={15}
        width={15}
        fill={accountColor ? AccountColors[accountColor].primaryValue : ""}
        className={!props.className && primary ? "fill-primary" : ""}
      />
    </>
  );

  const hasValidHref = Boolean(href && href !== "#");

  if (!hasValidHref) {
    return (
      <button
        type="button"
        {...(props as ComponentProps<"button">)}
        className={className}
        onClick={onClick as unknown as MouseEventHandler<HTMLButtonElement>}
      >
        {content}
      </button>
    );
  }

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented) return;

    if (replace) {
      event.preventDefault();
      router.replace(href as string);
    }
  };

  return (
    <Link
      {...props}
      href={href as string}
      className={className}
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}
