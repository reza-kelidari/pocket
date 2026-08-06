"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

export default function SortableAccountItem({
  account,
  children,
}: {
  account: { id: string };
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing p-1 text-secondary"
        aria-label="جابجایی"
      >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
          <circle cx="3" cy="4" r="1.5" />
          <circle cx="3" cy="10" r="1.5" />
          <circle cx="3" cy="16" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="11" cy="10" r="1.5" />
          <circle cx="11" cy="16" r="1.5" />
        </svg>
      </button>

      <div className="flex-1">{children}</div>
    </div>
  );
}
