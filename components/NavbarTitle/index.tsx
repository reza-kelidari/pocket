import Right from "@/icons/Right";
import { IconComponent } from "@/icons/types";
import Link from "next/link";

type NavbarTitleType = {
  redirect: string;
  option?: { link: string; Icon: IconComponent };
  children?: React.ReactNode;
  title: string;
};
export default function NavbarTitle({
  redirect,
  option,
  children,
  title,
}: NavbarTitleType) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-cente gap-4">
        <Link href={redirect}>
          <div className="flex items-center gap-1">
            <Right height={15} width={15} className="fill-primary" />
            <h2 className="text-lg font-medium">{title}</h2>
          </div>
        </Link>
      </div>
      {children}
    </div>
  );
}
