import { PrimaryColors } from "@/utility/colors";
import Link from "next/link";
import { ComponentProps } from "react";

type ButtonParamsType = ComponentProps<"a"> & {
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
  href: link,
  ...props
}: ButtonParamsType) {
  return (
    <Link href={!disabled ? link || "" : ""} className="w-full" {...props}>
      <div
        className={`border text-xs h-11.5 w-full grid place-content-center rounded-2xl
        ${
          !secondary && !red && !disabled
            ? PrimaryColors.primary.box
            : secondary
              ? PrimaryColors.secondary.box
              : red
                ? PrimaryColors.red.box
                : PrimaryColors.disabled.box
        }`}
      >
        {children}
      </div>
    </Link>
  );
}
