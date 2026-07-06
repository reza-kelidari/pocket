import Link from "next/link";

type QuickAccessParamsType = {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  link: string;
  children: React.ReactNode;
};

export default function QuickAccess({ Icon, children, link }: QuickAccessParamsType) {
  return (
    <Link href={link}><div className="flex flex-col gap-2.5 items-center">
      <div className="h-11.5 w-11.5 grid place-items-center border border-primary-border bg-primary-background rounded-2xl">
        <Icon height={25} width={25} className="fill-primary" />
      </div>
      <h3 className="text-xs">{children}</h3>
    </div></Link>
  );
}
