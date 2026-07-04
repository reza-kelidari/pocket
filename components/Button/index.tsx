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
            ? "border-primary-border bg-primary-background text-primary"
            : secondary
              ? "border-elements-border bg-elements-background text-black"
              : red
                ? "border-red-border - bg-red-background text-red"
                : "border-elements-border bg-elements-background text-secondary opacity-75"
        }`}
      >
        {children}
      </div>
    </Link>
  );
}
