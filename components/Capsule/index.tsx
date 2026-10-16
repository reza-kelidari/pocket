/**
 * @fileoverview Capsule Button
 *
 * A small, pill-shaped interactive element used throughout the app for
 * inline actions and filter chips. Renders as either:
 * - an `<a>` (via Next.js `<Link>`) when a valid `href` is provided, or
 * - a `<button>` otherwise.
 *
 * ### Styling
 *
 * The component composes three layers of classes with `twMerge` so they
 * can be combined and overridden predictably:
 *
 * 1. **Base shape** — pill geometry, border, padding, flex layout.
 * 2. **Color variant** — `PrimaryColors.primary.box` when `primary` is
 *    true, otherwise `PrimaryColors.secondary.box`.
 * 3. **Caller `className`** — layered last so callers can override any
 *    of the above (e.g. account-specific colors on filter chips).
 *
 * This composition is important: previously, passing any `className`
 * would *replace* the primary/secondary variant entirely, so filter
 * chips lost their colors. Merging fixes that.
 *
 * ### Icon color
 *
 * When `accountColor` is provided, the trailing icon is tinted with that
 * account's primary color via an inline `style` — this bypasses Tailwind
 * so the color is available even though the icon uses `fill="currentColor"`.
 *
 * @module components/Capsule
 */

"use client";

import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import { IconComponent } from "@/icons/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";
import type {
  ComponentProps,
  MouseEvent as ReactMouseEvent,
  MouseEventHandler,
} from "react";
import type { AccountColorType } from "@/utility/accounts/types";

/**
 * Props accepted by {@link Capsule}.
 */
type CapsulePropsType = Omit<ComponentProps<"a">, "onClick"> & {
  /** Icon component rendered after the label. */
  Icon: IconComponent;
  /** Label / content rendered inside the capsule. */
  children: React.ReactNode;
  /**
   * When provided and not `"#"`, the capsule renders as a link to this URL.
   * Otherwise it renders as a `<button>`.
   */
  href?: string;
  /** When true, uses the primary color variant instead of secondary. */
  primary?: boolean;
  /** Optional account color used to tint the trailing icon. */
  accountColor?: AccountColorType;
  /** When true and rendering a link, uses `router.replace` instead of push. */
  replace?: boolean;
  /** Optional click handler, applied to both link and button variants. */
  onClick?: MouseEventHandler<HTMLElement>;
};

/**
 * Renders a pill-shaped button or link.
 *
 * @param props - See {@link CapsulePropsType}.
 * @returns The rendered capsule element.
 */
export default function Capsule({
  onClick,
  Icon,
  children,
  href,
  primary,
  accountColor,
  replace,
  ...props
}: CapsulePropsType) {
  const router = useRouter();

  // ─── Compose all styling layers with twMerge ────────────────
  // Base → color variant → caller overrides. `props.className` is
  // intentionally last so callers can override any of the layers above.
  const className = twMerge(
    "border px-2.5 py-2 rounded-4xl text-xs flex items-center gap-1 text-nowrap",
    primary ? PrimaryColors.primary.box : PrimaryColors.secondary.box,
    props.className,
  );

  const content = (
    <>
      {children}
      <Icon
        height={15}
        width={15}
        className="fill-current"
        style={
          accountColor
            ? { color: AccountColors[accountColor].primaryValue }
            : undefined
        }
      />
    </>
  );

  const hasValidHref = Boolean(href && href !== "#");

  // ─── Render as button when there's no navigable href ────────
  if (!hasValidHref) {
    return (
      <button
        type="button"
        {...(props as ComponentProps<"button">)}
        className={className}
        onClick={onClick as unknown as MouseEventHandler<HTMLButtonElement>}
      >
        {content}
      </button>
    );
  }

  // ─── Render as link ─────────────────────────────────────────
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented) return;
    if (replace) {
      event.preventDefault();
      router.replace(href as string);
    }
  };

  return (
    <Link
      {...props}
      href={href as string}
      className={className}
      onClick={handleClick}
    >
      {content}
    </Link>
  );
}
