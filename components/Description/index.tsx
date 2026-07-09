import { ComponentProps } from "react";

export default function Description({
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p {...props} className={`text-xs text-secondary text-justify ${props.className}`}>
      {children}
    </p>
  );
}
