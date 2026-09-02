import { BookOpen, ChevronRight } from "lucide-react";
import { stripForceLanguageMarkup } from "../../engine/speech";

export function PlayerProjectSlideListHeader({ count = 0 }) {
  return (
    <div className="mt-5 mb-3 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
      <div>
        <p className="text-sm font-normal text-white/70">Materi</p>
        <p className="text-xs text-white/40">Slide materials</p>
      </div>
      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/45">
        {count} slide
      </span>
    </div>
  );
}

export default function PlayerProjectSlideList({
  slides = [],
  activeSlideId = null,
  onSelectSlide,
}) {
  const list = Array.isArray(slides) ? slides : [];

  if (list.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">
        <BookOpen className="mx-auto mb-2 size-5 text-white/25" />
        <p className="text-xs text-white/45">Belum ada Slide pada project ini.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {list.map((slide, index) => {
        const active = slide?.id === activeSlideId;
        const title = slide?.title || `Slide ${index + 1}`;

        return (
          <button
            key={slide?.id || `slide-${index}`}
            type="button"
            onClick={() => slide?.id && onSelectSlide?.(slide.id)}
            className={[
              "cursor-pointer group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
              active
                ? "border-secondary-default/70 bg-secondary-default/10"
                : "border-white/10 bg-white/[0.03] hover:border-secondary-default/60 hover:bg-secondary-default/10",
            ].join(" ")}
            title={`Open ${title}`}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary-default/10 text-secondary-default">
              <BookOpen className="size-4" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white/90">
                {title}
              </span>
              {slide?.description ? (
                <span className="mt-0.5 block truncate text-xs text-white/40">
                  {stripForceLanguageMarkup(slide.description)}
                </span>
              ) : (
                <span className="mt-0.5 block text-[10px] text-white/30">
                  Slide {index + 1}
                </span>
              )}
            </span>

            <ChevronRight className="size-4 shrink-0 text-white/30 transition group-hover:text-secondary-default" />
          </button>
        );
      })}
    </div>
  );
}
