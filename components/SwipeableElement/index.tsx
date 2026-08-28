import { useState, useRef, useEffect } from "react";
import Button from "@/components/Button";

const ACTION_WIDTH = 100;

export default function SwipeableElement({
  children,
  isOpen,
  onOpenChange,
  onCloseOthers,
  onEdit,
  onDelete,
  defaultAccount,
  cancelConfirmSignal,
  confirmDelete = false,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseOthers: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  defaultAccount?: boolean;
  cancelConfirmSignal?: number;
  confirmDelete?: boolean;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const startTranslateX = useRef(0);
  const prevSignal = useRef(cancelConfirmSignal);

  const canEdit = !!onEdit;
  const canDelete = !!onDelete && !defaultAccount;

  const minTranslate = canEdit ? -ACTION_WIDTH : 0;
  const maxTranslate = canDelete ? ACTION_WIDTH : 0;
  const isSwipeable = canEdit || canDelete;

  useEffect(() => {
    if (!isOpen && !isDragging && !confirmingDelete) {
      setTranslateX(0);
    }
  }, [isOpen, isDragging, confirmingDelete]);

  useEffect(() => {
    if (
      cancelConfirmSignal !== undefined &&
      cancelConfirmSignal !== prevSignal.current
    ) {
      setConfirmingDelete(false);
    }
    prevSignal.current = cancelConfirmSignal;
  }, [cancelConfirmSignal]);

  useEffect(() => {
    if (!confirmDelete && confirmingDelete) {
      setConfirmingDelete(false);
    }
  }, [confirmDelete, confirmingDelete]);

  const handleStart = (clientX: number) => {
    if (!isSwipeable || confirmingDelete) return;
    if (!isOpen) {
      onCloseOthers();
    }
    startX.current = clientX;
    currentX.current = clientX;
    startTranslateX.current = translateX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || confirmingDelete) return;
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
    if (!isDragging || confirmingDelete) return;
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

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setTranslateX(0);
      onOpenChange(false);
      onDelete?.();
      return;
    }
    setConfirmingDelete(true);
    setTranslateX(0);
    onOpenChange(false);
  };

  const handleConfirmDelete = () => {
    setConfirmingDelete(false);
    onDelete?.();
  };

  const handleCancelDelete = () => {
    setConfirmingDelete(false);
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
      {canEdit && !confirmingDelete && (
        <div className="absolute inset-y-0 right-0 w-22.5 flex items-stretch me-2">
          <Button onClick={onEdit} className="h-full! w-full">
            ویرایش
          </Button>
        </div>
      )}
      {canDelete && !confirmingDelete && (
        <div className="absolute inset-y-0 left-0 w-22.5 flex items-stretch ms-2">
          <Button red onClick={handleDeleteClick} className="h-full! w-full">
            حذف
          </Button>
        </div>
      )}
      <div
        {...dragProps}
        className={`relative z-10 bg-white select-none rounded-2xl ${
          confirmingDelete ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.3s ease-out, opacity 0.3s ease-out",
          touchAction: isSwipeable ? "pan-y" : "auto",
          cursor: isSwipeable ? "grab" : "default",
        }}
      >
        {children}
      </div>
      <div
        className={`absolute inset-0 z-20 flex items-center justify-between px-2 transition-opacity duration-300 ${
          confirmingDelete ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-xs text-red font-medium">حذف بشه؟</span>
        <div className="flex items-center gap-4">
          <Button
            red
            onClick={handleConfirmDelete}
            className="h-9! w-auto! px-3"
          >
            تأیید حذف
          </Button>
          <Button onClick={handleCancelDelete} className="h-9! w-auto! px-3">
            لغو
          </Button>
        </div>
      </div>
    </div>
  );
}
