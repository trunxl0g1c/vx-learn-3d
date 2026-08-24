import { useId } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/button";

// A single-action, undismissable modal — no Escape handler, no backdrop
// dismiss, no header close button. Used when the user must be forced out of
// something (removed from editing a content) rather than given a choice, so
// it deliberately does NOT reuse ConfirmationDialog: that component's three
// independent dismiss paths (Escape, header X, backdrop click) plus its
// mandatory Cancel button are all wrong for a notice the user can't opt out
// of. Copies ConfirmationDialog's visual shell so it still reads as the
// same family of dialog.
export default function ForcedActionDialog({
  open,
  title = "Notice",
  message,
  description,
  actionText = "OK",
  onAction,
}) {
  const titleId = useId();
  const descriptionId = useId();

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-[460px] overflow-hidden rounded-[22px] border border-divider-main bg-[#151d1d] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]"
      >
        <div className="flex min-h-[70px] items-center bg-dark-alpha px-5">
          <h3 id={titleId} className="text-xl font-normal tracking-[-0.2px]">
            {title}
          </h3>
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
          <Button
            type="button"
            variant="gold"
            onClick={onAction}
            className="w-full rounded-xl"
          >
            {actionText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
