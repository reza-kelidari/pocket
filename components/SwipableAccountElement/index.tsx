import { useState, useRef, useEffect } from "react";

const ACTION_WIDTH = 100;

export default function SwipeableAccountItem({
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
  onEdit: () => void;
  onDelete: () => void;
  defaultAccount?: boolean;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const startTranslateX = useRef(0);

  useEffect(() => {
    if (!isOpen && !isDragging) {
      setTranslateX(0);
    }
  }, [isOpen, isDragging]);

  const handleStart = (clientX: number) => {
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

    let clampedDelta;
    const maxLimit = defaultAccount ? 0 : ACTION_WIDTH;

    if (startTranslateX.current > 0) {
      clampedDelta = Math.max(0, Math.min(maxLimit, rawTranslate));
    } else if (startTranslateX.current < 0) {
      clampedDelta = Math.max(-ACTION_WIDTH, Math.min(0, rawTranslate));
    } else {
      clampedDelta = Math.max(-ACTION_WIDTH, Math.min(maxLimit, rawTranslate));
    }

    setTranslateX(clampedDelta);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const delta = currentX.current - startX.current;
    const threshold = ACTION_WIDTH / 3;

    if (startTranslateX.current === 0) {
      if (delta > threshold && !defaultAccount) {
        setTranslateX(ACTION_WIDTH);
        onOpenChange(true);
      } else if (delta < -threshold) {
        setTranslateX(-ACTION_WIDTH);
        onOpenChange(true);
      } else {
        setTranslateX(0);
        onOpenChange(false);
      }
    } else if (startTranslateX.current > 0) {
      if (delta < -threshold) {
        setTranslateX(0);
        onOpenChange(false);
      } else {
        setTranslateX(ACTION_WIDTH);
      }
    } else if (startTranslateX.current < 0) {
      if (delta > threshold) {
        setTranslateX(0);
        onOpenChange(false);
      } else {
        setTranslateX(-ACTION_WIDTH);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 w-22.5 bg-primary-background border border-primary-border flex items-center justify-center rounded-2xl me-2">
        <button
          onClick={onEdit}
          className="text-primary text-xs font-medium w-full h-full"
        >
          ویرایش
        </button>
      </div>

      {!defaultAccount && (
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
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => isDragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => isDragging && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        className="relative z-10 bg-white select-none rounded-2xl"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
