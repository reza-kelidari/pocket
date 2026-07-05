import { PrimaryColors } from "@/features/colors";
import Link from "next/link";

type ButtonParamsType = {
  children: React.ReactNode;
  secondary?: boolean;
  red?: boolean;
  disabled?: boolean;
  link?: string;
};

export default function Button({
  children,
  secondary,
  red,
  disabled,
  link,
}: ButtonParamsType) {
  return (
    <Link href={!disabled ? link || "" : ""} className="w-full">
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
