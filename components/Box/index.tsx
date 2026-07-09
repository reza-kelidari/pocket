import { ComponentProps } from "react";

export default function Box({
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`w-full bg-elements-background border border-elements-border rounded-4xl p-5 flex flex-col gap-2.5 shadow-xl shadow-zinc-100 ${props.className}`}
    >
      {children}
    </div>
  );
}
