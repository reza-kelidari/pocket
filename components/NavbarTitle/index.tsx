"use client";

import Right from "@/icons/Right";
import { useRouter } from "next/navigation";
import { ComponentProps } from "react";

type NavbarTitleType = ComponentProps<"div"> & {
  children?: React.ReactNode;
  title: string;
  disabled?: boolean;
};

export default function NavbarTitle({
  children,
  title,
  disabled,
  onClick,
}: NavbarTitleType) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (onClick) {
      onClick(e);
    }

    router.back();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-cente gap-4">
        <div className="cursor-pointer" onClick={handleClick}>
          <div className="flex items-center gap-1">
            {!disabled && (
              <Right height={15} width={15} className="fill-primary" />
            )}
            <h2 className="text-lg font-medium">{title}</h2>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
