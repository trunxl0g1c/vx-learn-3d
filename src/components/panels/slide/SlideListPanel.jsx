import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button, { cn } from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function SlideListPanel({ slideAuthoring }) {
  const slides = slideAuthoring?.slides || [];
  const activeSlideId = slideAuthoring?.activeSlideId || null;
  const reorderSlide = slideAuthoring?.reorderSlide;
  const [draggingSlideId, setDraggingSlideId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const dropTargetRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const dragPreviewElementRef = useRef(null);
  const dragFrameRef = useRef(0);

  const draggingSlide = useMemo(
    () => slides.find((slide) => slide.id === draggingSlideId) || null,
    [draggingSlideId, slides],
  );
  const draggingSlideIndex = draggingSlide
    ? slides.findIndex((slide) => slide.id === draggingSlide.id)
    : -1;

  useEffect(() => {
    if (!draggingSlideId) return undefined;

    const updatePreviewPosition = (clientX, clientY) => {
      const preview = dragPreviewRef.current;
      if (!preview) return;

      preview.clientX = clientX;
      preview.clientY = clientY;

      if (dragFrameRef.current) return;
      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = 0;
        const element = dragPreviewElementRef.current;
        const current = dragPreviewRef.current;
        if (!element || !current) return;

        element.style.transform = `translate3d(${current.clientX - current.offsetX}px, ${current.clientY - current.offsetY}px, 0)`;
      });
    };

    const handlePointerMove = (event) => {
      event.preventDefault();
      updatePreviewPosition(event.clientX, event.clientY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const slideElement = element?.closest?.("[data-slide-list-id]");
      const targetSlideId = slideElement?.dataset?.slideListId || null;

      if (!targetSlideId || targetSlideId === draggingSlideId) {
        if (dropTargetRef.current) {
          dropTargetRef.current = null;
          setDropTarget(null);
        }
        return;
      }

      const rect = slideElement.getBoundingClientRect();
      const placement =
        event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      const currentTarget = dropTargetRef.current;

      if (
        currentTarget?.slideId === targetSlideId &&
        currentTarget?.placement === placement
      ) {
        return;
      }

      const nextDropTarget = { slideId: targetSlideId, placement };
      dropTargetRef.current = nextDropTarget;
      setDropTarget(nextDropTarget);
    };

    const finishDrag = () => {
      const target = dropTargetRef.current;
      if (target?.slideId) {
        reorderSlide?.(
          draggingSlideId,
          target.slideId,
          target.placement,
        );
      }

      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = 0;
      }

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragPreviewRef.current = null;
      dropTargetRef.current = null;
      setDragPreview(null);
      setDraggingSlideId(null);
      setDropTarget(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = 0;
      }
    };
  }, [draggingSlideId, reorderSlide]);

  const startDrag = (event, slide) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const card = event.currentTarget.closest("[data-slide-list-card]");
    const rect = card?.getBoundingClientRect();
    if (!rect) return;

    const preview = {
      width: rect.width,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
    };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    dragPreviewRef.current = preview;
    dropTargetRef.current = null;
    setDragPreview(preview);
    setDraggingSlideId(slide.id);
    setDropTarget(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
        Slide
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="m-3 rounded-2xl bg-dark-alpha p-3">
          <Button
            size="sm"
            type="button"
            onClick={slideAuthoring?.createSlide}
            className="w-full gap-2"
          >
            <MaterialIcon name="add" size={18} />
            Create New Slide
          </Button>
          <p className="mt-2 text-[11px] leading-4 text-contrast-grayout">
            Slide dapat dibuat langsung tanpa menghubungkannya ke object 3D.
          </p>
        </div>

        {slides.length === 0 ? (
          <div className="mx-4 rounded-xl border border-dashed border-divider-main p-4 text-sm leading-5 text-contrast-grayout">
            Belum ada slide. Pilih Create New Slide untuk mulai membuat materi.
          </div>
        ) : (
          slides.map((slide, index) => {
            const active = slide.id === activeSlideId;
            const isDragging = draggingSlideId === slide.id;
            const showDropBefore =
              dropTarget?.slideId === slide.id &&
              dropTarget.placement === "before";
            const showDropAfter =
              dropTarget?.slideId === slide.id &&
              dropTarget.placement === "after";

            return (
              <div
                key={slide.id}
                data-slide-list-id={slide.id}
                className="relative mx-4 mb-3"
              >
                {showDropBefore && (
                  <div className="pointer-events-none absolute -top-1.5 left-2 right-2 z-10 h-0.5 rounded-full bg-secondary-default shadow-[0_0_8px_rgba(86,205,223,0.75)]" />
                )}

                <div
                  data-slide-list-card
                  className={cn(
                    "flex overflow-hidden rounded-lg border border-contrast-grayout bg-dark-alpha transition",
                    "hover:border-accent-main hover:bg-primary/50",
                    active && "border-accent-main! bg-primary",
                    isDragging && "border-dashed opacity-20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (draggingSlideId) return;
                      slideAuthoring?.previewSlide?.(slide.id);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                    title={`Edit ${slide.title || `Slide ${index + 1}`}`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-divider-main bg-primary text-secondary-default">
                      <MaterialIcon name="menu_book" size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {slide.title || `Slide ${index + 1}`}
                      </span>
                      <span className="mt-1 block truncate text-xs text-grayout-main">
                        {slide.description || "No description"}
                      </span>
                    </span>
                    <MaterialIcon
                      name="edit"
                      size={18}
                      className="shrink-0 text-secondary-default"
                    />
                  </button>

                  <div className="flex w-10 shrink-0 items-center justify-center border-l border-divider-main">
                    <button
                      type="button"
                      onPointerDown={(event) => startDrag(event, slide)}
                      className="grid size-8 touch-none cursor-grab place-items-center rounded-md text-secondary-default transition hover:bg-white/10 active:cursor-grabbing"
                      title={`Drag slide ${index + 1} to reorder`}
                      aria-label={`Drag slide ${index + 1} to reorder`}
                    >
                      <MaterialIcon name="drag_indicator" size={21} />
                    </button>
                  </div>
                </div>

                {showDropAfter && (
                  <div className="pointer-events-none absolute -bottom-1.5 left-2 right-2 z-10 h-0.5 rounded-full bg-secondary-default shadow-[0_0_8px_rgba(86,205,223,0.75)]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {dragPreview && draggingSlide && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dragPreviewElementRef}
            className="pointer-events-none fixed left-0 top-0 z-[1200] will-change-transform"
            style={{
              width: `${dragPreview.width}px`,
              transform: `translate3d(${dragPreview.clientX - dragPreview.offsetX}px, ${dragPreview.clientY - dragPreview.offsetY}px, 0)`,
            }}
            aria-hidden="true"
          >
            <div className="scale-[1.035] -rotate-[0.35deg] overflow-hidden rounded-lg border border-secondary-default bg-[#171b1b]/95 opacity-95 shadow-2xl ring-1 ring-secondary-default/30 backdrop-blur-sm">
              <div className="flex items-stretch">
                <div className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-divider-main bg-primary text-secondary-default">
                    <MaterialIcon name="menu_book" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {draggingSlide.title || `Slide ${draggingSlideIndex + 1}`}
                    </span>
                    <span className="mt-1 block truncate text-xs text-grayout-main">
                      {draggingSlide.description || "No description"}
                    </span>
                  </span>
                  <MaterialIcon
                    name="edit"
                    size={18}
                    className="shrink-0 text-secondary-default"
                  />
                </div>
                <div className="flex w-10 shrink-0 items-center justify-center border-l border-divider-main">
                  <span className="grid size-8 place-items-center rounded-md bg-white/5 text-secondary-default">
                    <MaterialIcon name="drag_indicator" size={21} />
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
