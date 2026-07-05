import { PrimaryColors, PrimaryColorsItemType } from "@/features/colors";
import Link from "next/link";
import { JSX } from "react/jsx-runtime";

type ListElementType = {
  children: React.ReactNode;
  color: PrimaryColorsItemType;
  Icon: JSX.ElementType | "";
  link: string;
};

export default function ListElement({
  children,
  color,
  Icon,
  link,
}: ListElementType) {
  return (
    <Link href={link} className="w-full">
      <div
        className={`${PrimaryColors.secondary.box} p-4 flex items-center gap-2.5 w-full rounded-2xl`}
      >
        <div
          className={`h-7.5 w-7.5 ${color.primary} rounded-4xl grid place-content-center`}
        >
          <Icon height={17} width={17} fill="#fff" />
        </div>
        <span
          className={`${color !== PrimaryColors.primary ? color.text : ""}`}
        >
          {children}
        </span>
      </div>
    </Link>
  );
}
