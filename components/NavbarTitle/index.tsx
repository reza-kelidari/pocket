"use client";

import Right from "@/icons/Right";
import { IconComponent } from "@/icons/types";
import { useRedirect } from "@/utility/redirect/service/useRedirect";
import { useRouter } from "next/navigation";
import { ComponentProps } from "react";

type NavbarTitleType = ComponentProps<"a"> & {
  option?: { link: string; Icon: IconComponent };
  children?: React.ReactNode;
  title: string;
  disabled?: boolean;
};
export default function NavbarTitle({
  option,
  children,
  title,
  disabled,
}: NavbarTitleType) {
  const { back } = useRedirect();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-cente gap-4">
        <div
          className="cursor-pointer"
          onClick={() => {
            !disabled && router.replace(back());
          }}
        >
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
