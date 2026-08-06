import { ComponentProps } from "react";

export default function Description({
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p {...props} className={`text-xs text-secondary text-justify leading-6 ${props.className}`}>
      {children}
    </p>
  );
}
