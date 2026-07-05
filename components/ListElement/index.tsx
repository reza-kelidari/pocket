import { PrimaryColors, PrimaryColorsItemType } from "@/features/colors";
import Link from "next/link";
import { ComponentProps } from "react";

type ListElementProps = ComponentProps<typeof Link> & {
  iconColor: PrimaryColorsItemType;
  Icon: React.ReactNode;
};

export default function ListElement({
  children,
  iconColor,
  Icon,
  ...props
}: ListElementProps) {
  return (
    <Link className="w-full" {...props}>
      <div
        className={`${PrimaryColors.secondary.box} p-4 flex items-center gap-2.5 w-full rounded-2xl`}
      >
        <div
          className={`h-7.5 w-7.5 ${iconColor.primary} rounded-4xl grid place-content-center`}
        >
          {Icon}
        </div>

        <span
          className={iconColor !== PrimaryColors.primary ? iconColor.text : ""}
        >
          {children}
        </span>
      </div>
    </Link>
  );
}
