import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../ui/button";

export default function ConfirmationDialog({
  open,
  title = "Are you sure?",
  message,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "destructive",
  isLoading = false,
  closeOnBackdrop = true,
  onConfirm,
  onClose,
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isLoading, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const handleBackdropMouseDown = (event) => {
    if (closeOnBackdrop && !isLoading && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleConfirm = async () => {
    await onConfirm?.();
  };

  return createPortal(
    <div
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-[460px] overflow-hidden rounded-[22px] border border-divider-main bg-[#151d1d] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]"
      >
        <div className="flex min-h-[70px] items-center justify-between bg-dark-alpha px-5">
          <h3 id={titleId} className="text-xl font-normal tracking-[-0.2px]">
            {title}
          </h3>

          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
              aria-label="Close confirmation"
            >
              <X strokeWidth={2.2} className="size-7" />
            </button>
          )}
        </div>

        <div className="px-7 py-7">
          {message && (
            <div className="text-base leading-6 text-white/80">{message}</div>
          )}

          {description && (
            <div
              id={descriptionId}
              className="mt-3 text-sm leading-6 text-grayout-main"
            >
              {description}
            </div>
          )}
        </div>

        <div className="border-t border-divider-main px-6 py-5">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              variant={confirmVariant}
              disabled={isLoading}
              onClick={handleConfirm}
              className="flex-1 rounded-xl"
            >
              {isLoading ? "Processing..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
