import Link from "next/link";

type ButtonParamsType = {
  children: React.ReactNode;
  secondary?: boolean;
  red?: boolean;
  link?: string;
};

export default function Button({
  children,
  secondary,
  red,
  link,
}: ButtonParamsType) {
  return (
    <Link href={link || ""}>
      <div
        className={`border text-xs h-11.5 w-full grid place-content-center rounded-2xl
        ${
          !secondary && !red
            ? "border-primary-border bg-primary-background text-primary"
            : secondary
              ? "border-elements-border bg-elements-background text-secondary"
              : "border-red-border - bg-red-background text-red"
        }`}
      >
        {children}
      </div>
    </Link>
  );
}
