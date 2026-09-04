import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import MaterialIcon from "../ui/material-icon";

export default function PlayerSlideListPanel({
  slides = [],
  activeSlideId = null,
  onSelectSlide,
  onClose,
}) {
  const list = Array.isArray(slides) ? slides : [];
  const activeIndex = list.findIndex((slide) => slide.id === activeSlideId);
  const canPrevious = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < list.length - 1;

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[92px] top-7 z-50 flex max-h-[80vh] w-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#182223]/75 p-5 text-white shadow-2xl backdrop-blur-xl backdrop-saturate-200">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-white hover:bg-white/10"
        title="Close Slides"
      >
        <X className="size-5" />
      </button>

      <div className="mb-5 flex items-center gap-3 pr-10">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-secondary-default/40 bg-secondary-default/10 text-secondary-default">
          <BookOpen className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold">Slides</h3>
          <p className="mt-0.5 text-[11px] text-white/50">Presentation content</p>
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-white/50">
            No slide has been created yet.
          </div>
        ) : (
          list.map((slide, index) => {
            const active = slide.id === activeSlideId;
            return (
              <button
                key={slide.id || index}
                type="button"
                onClick={() => onSelectSlide?.(slide.id)}
                className={[
                  "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-4 py-4 text-left transition",
                  active
                    ? "border-secondary-default/70 bg-white/[0.08] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:border-secondary-default/60 hover:bg-secondary-default/10 hover:text-white",
                ].join(" ")}
              >
                <span className="text-xs tabular-nums text-white/55">{index + 1}.</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{slide.title || `Slide ${index + 1}`}</span>
                  {slide.description && (
                    <span className="mt-1 block truncate text-[10px] text-white/45">{slide.description}</span>
                  )}
                </span>
                <MaterialIcon name="arrow_right_alt" fill size={20} className="text-secondary-default" />
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={!canPrevious}
          onClick={() => onSelectSlide?.(list[activeIndex - 1]?.id)}
          className="grid size-9 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30"
          title="Previous Slide"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onSelectSlide?.(list[activeIndex + 1]?.id)}
          className="grid size-9 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30"
          title="Next Slide"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </aside>
  );
}
