import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterDeleteButton({ chapter, onDelete }) {
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

  if (!chapter) return null;

  const chapterTitle = chapter.title || chapter.objectName || "Untitled Content";

  const handleConfirmDelete = () => {
    setIsConfirmOpen(false);
    onDelete?.(chapter.id);
  };

  const confirmationDialog = isConfirmOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
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
            className="w-full max-w-[460px] overflow-hidden rounded-[22px] border border-divider-main bg-[#1d1e1f] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]"
          >
            <div className="flex min-h-[70px] items-center justify-between bg-dark-alpha px-5">
              <h3
                id="delete-content-title"
                className="text-xl font-normal tracking-[-0.2px]"
              >
                Delete Content?
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
              <p className="text-sm leading-6 text-white/80">
                Content{" "}
                <strong className="font-normal text-white">
                  “{chapterTitle}”
                </strong>{" "}
                will be permanently deleted.
              </p>

              <p className="mt-3 text-sm leading-6 text-grayout-main">
                Description, parameters, markers, media, animations, camera view,
                and visual state belonging to this content will also be removed.
                The 3D object itself will not be deleted.
              </p>
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
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl border-red-500 bg-red-600 text-white hover:bg-red-500"
                >
                  <Trash2 className="size-4" />
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
      <div className="shrink-0 border-t border-divider-main bg-primary px-4 pb-4 pt-3 backdrop-blur-3xl">
        <div className="mb-2 text-xs font-normal uppercase tracking-[0.14em] text-red-300/80">
          Danger Zone
        </div>

        <Button
          type="button"
          variant="destructive"
          size="md"
          onClick={() => setIsConfirmOpen(true)}
          className="w-full rounded-2xl bg-red-500/5"
        >
          <Trash2 className="size-4" />
          Delete Content
        </Button>
      </div>

      {confirmationDialog}
    </>
  );
}
