import { PrimaryColors } from "@/utility/colors";
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
  const className = `border text-xs h-11.5 w-full grid place-content-center rounded-2xl
    ${
      !secondary && !red && !disabled
        ? PrimaryColors.primary.box
        : secondary
          ? PrimaryColors.secondary.box
          : red
            ? PrimaryColors.red.box
            : PrimaryColors.disabled.box
    }`;

  // اگر href داشته باشد و غیرفعال نباشد، به عنوان لینک رندر می‌شود
  if (href && !disabled) {
    return (
      <Link href={href} className="w-full" {...(props as ComponentProps<"a">)}>
        <div className={className}>{children}</div>
      </Link>
    );
  }

  // در غیر این صورت، به عنوان یک دکمه استاندارد رندر می‌شود
  return (
    <button
      type="button"
      disabled={disabled}
      className="w-full"
      {...(props as ComponentProps<"button">)}
    >
      <div className={className}>{children}</div>
    </button>
  );
}
