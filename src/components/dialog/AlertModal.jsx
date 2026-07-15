import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import Button from "../ui/button";

const ALERT_ICONS = {
  info: Info,
  warning: TriangleAlert,
  error: AlertCircle,
  success: CheckCircle2,
};

export default function AlertModal({
  open,
  title = "Notification",
  message = "",
  type = "info",
  confirmText = "OK",
  showCloseButton = false,
  closeOnBackdrop = true,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const Icon = ALERT_ICONS[type] ?? Info;

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirm === "function") {
      onConfirm();
    }

    handleClose();
  };

  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget) return;
    if (!closeOnBackdrop) return;

    handleClose();
  };

  return (
    <div
      role="presentation"
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-[999] grid place-items-center bg-black/45 px-4 backdrop-blur-sm"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        aria-describedby="alert-modal-description"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[500px] overflow-hidden rounded-[20px] bg-[#151d1d] text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <div className="flex h-18 items-center justify-between border-divider-main px-5 bg-dark-alpha">
          <h2
            id="alert-modal-title"
            className="text-lg font-normal text-white"
          >
            {title}
          </h2>

          {showCloseButton && (
            <button
              type="button"
              onClick={handleClose}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-accent-main transition hover:bg-white/5"
              aria-label="Close notification"
              title="Close"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="flex items-start gap-4 px-6 py-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-main/10">
            <Icon className="size-6 text-accent-main" />
          </div>

          <div className="min-w-0 space-y-1 pt-1">
            <p
              id="alert-modal-description"
              className="text-base leading-6"
            >
              {message}
            </p>
          </div>
        </div>

        {/* <div className="flex justify-end px-6 pb-4">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleConfirm}
            className="w-1/3"
          >
            {confirmText}
          </Button>
        </div> */}
      </div>
    </div>
  );
}
