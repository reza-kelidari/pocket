import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = (props: IconProps) => React.JSX.Element;