import { useEffect, useState } from "react";
import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function DeleteFlowMaterialButton({ flow, activeFlow }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isConfirmOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirmOpen]);

  if (!flow || !activeFlow) return null;

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    flow.deleteFlow(activeFlow.id);
  };

  const confirmationDialog = isConfirmOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-content-title"
            aria-describedby="delete-content-description"
            className="w-full max-w-[460px] overflow-hidden rounded-[22px] border border-divider-main bg-[#151d1d] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]"
          >
            <div className="flex min-h-[70px] items-center justify-between bg-dark-alpha px-5">
              <h3
                id="delete-content-title"
                className="text-xl font-normal tracking-[-0.2px]"
              >
                Delete Flow Material?
              </h3>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="grid size-10 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
                aria-label="Close delete confirmation"
              >
                <X strokeWidth={2.2} className="size-7" />
              </button>
            </div>

            <div id="delete-content-description" className="px-7 py-7">
              <p className="text-base leading-6 text-white/80">
                <span className="font-normal text-white">Selected</span>
                flow material will be deleted. This action cannot be undone.
              </p>

              {/* <p className="mt-3 text-sm leading-6 text-grayout-main">
                Are you sure you want to clear all path points?
              </p> */}
            </div>

            <div className="border-t border-divider-main px-6 py-5">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConfirmOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setIsConfirmOpen(true)}
        className="text-sm w-full"
      >
        <MaterialIcon name="delete" fill={1} size={15} />
        Delete Flow Material
      </Button>

      {confirmationDialog}
    </>
  );
}
