import { useState, useRef, useEffect } from "react";

const ACTION_WIDTH = 100;

export default function SwipeableElement({
  children,
  isOpen,
  onOpenChange,
  onCloseOthers,
  onEdit,
  onDelete,
  defaultAccount,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseOthers: () => void;
  onEdit?: () => void; 
  onDelete?: () => void;
  defaultAccount?: boolean;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const startTranslateX = useRef(0);

  const canEdit = !!onEdit;
  const canDelete = !!onDelete && !defaultAccount; 

  const minTranslate = canEdit ? -ACTION_WIDTH : 0;
  const maxTranslate = canDelete ? ACTION_WIDTH : 0;

  const isSwipeable = canEdit || canDelete;

  useEffect(() => {
    if (!isOpen && !isDragging) {
      setTranslateX(0);
    }
  }, [isOpen, isDragging]);

  const handleStart = (clientX: number) => {
    if (!isSwipeable) return;

    if (!isOpen) {
      onCloseOthers();
    }

    startX.current = clientX;
    currentX.current = clientX;
    startTranslateX.current = translateX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    currentX.current = clientX;
    const delta = clientX - startX.current;
    const rawTranslate = startTranslateX.current + delta;

    const clampedDelta = Math.max(
      minTranslate,
      Math.min(maxTranslate, rawTranslate),
    );
    setTranslateX(clampedDelta);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const delta = currentX.current - startX.current;
    const threshold = ACTION_WIDTH / 3;

    if (startTranslateX.current === 0) {
      if (delta < -threshold && canEdit) {
        setTranslateX(-ACTION_WIDTH);
        onOpenChange(true);
      } else if (delta > threshold && canDelete) {
        setTranslateX(ACTION_WIDTH);
        onOpenChange(true);
      } else {
        setTranslateX(0);
        onOpenChange(false);
      }
    } else if (startTranslateX.current < 0) {
      if (delta > threshold) {
        setTranslateX(0);
        onOpenChange(false);
      } else {
        setTranslateX(-ACTION_WIDTH);
      }
    } else if (startTranslateX.current > 0) {
      if (delta < -threshold) {
        setTranslateX(0);
        onOpenChange(false);
      } else {
        setTranslateX(ACTION_WIDTH);
      }
    }
  };

  const dragProps = isSwipeable
    ? {
        onMouseDown: (e: React.MouseEvent) => handleStart(e.clientX),
        onMouseMove: (e: React.MouseEvent) =>
          isDragging && handleMove(e.clientX),
        onMouseUp: handleEnd,
        onMouseLeave: () => isDragging && handleEnd(),
        onTouchStart: (e: React.TouchEvent) =>
          handleStart(e.touches[0].clientX),
        onTouchMove: (e: React.TouchEvent) => handleMove(e.touches[0].clientX),
        onTouchEnd: handleEnd,
      }
    : {};

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {canEdit && (
        <div className="absolute inset-y-0 right-0 w-22.5 bg-primary-background border border-primary-border flex items-center justify-center rounded-2xl me-2">
          <button
            onClick={onEdit}
            className="text-primary text-xs font-medium w-full h-full"
          >
            ویرایش
          </button>
        </div>
      )}

      {canDelete && (
        <div className="absolute inset-y-0 left-0 w-22.5 bg-red-background border border-red-border flex items-center justify-center rounded-2xl ms-2">
          <button
            onClick={onDelete}
            className="text-red text-xs font-medium w-full h-full"
          >
            حذف
          </button>
        </div>
      )}

      <div
        {...dragProps}
        className="relative z-10 bg-white select-none rounded-2xl"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          touchAction: isSwipeable ? "pan-y" : "auto",
          cursor: isSwipeable ? "grab" : "default",
        }}
      >
        {children}
      </div>
    </div>
  );
}
