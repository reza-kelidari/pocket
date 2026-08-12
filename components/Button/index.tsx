import { PrimaryColors } from "@/utility/shared/colors";
import Link from "next/link";
import { ComponentProps } from "react";

type ButtonParamsType = ComponentProps<"a"> &
  ComponentProps<"button"> & {
    children: React.ReactNode;
    secondary?: boolean;
    red?: boolean;
    disabled?: boolean;
    href?: string;
  };

export default function Button({
  children,
  secondary,
  red,
  disabled,
  href,
  ...props
}: ButtonParamsType) {
  const className = `border text-xs h-11.5 w-full grid place-content-center rounded-2xl transition-all
    ${
      !secondary && !red && !disabled
        ? PrimaryColors.primary.box
        : secondary
          ? PrimaryColors.secondary.box
          : red
            ? PrimaryColors.red.box
            : PrimaryColors.disabled.box
    }
    ${props.className}`;

  if (href && !disabled) {
    return (
      <Link href={href} {...props} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} {...props} className={className}>
      {children}
    </button>
  );
}
