import Button, { cn } from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function SlideListPanel({ slideAuthoring }) {
  const slides = slideAuthoring?.slides || [];
  const activeSlideId = slideAuthoring?.activeSlideId || null;

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
            const canMoveUp = index > 0;
            const canMoveDown = index < slides.length - 1;

            return (
              <div
                key={slide.id}
                className={cn(
                  "mx-4 mb-3 flex overflow-hidden rounded-lg border border-contrast-grayout bg-dark-alpha transition",
                  "hover:border-accent-main hover:bg-primary/50",
                  active && "border-accent-main! bg-primary",
                )}
              >
                <button
                  type="button"
                  onClick={() => slideAuthoring?.previewSlide?.(slide.id)}
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

                <div className="flex w-10 shrink-0 flex-col border-l border-divider-main">
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    onClick={() => slideAuthoring?.moveSlide?.(slide.id, "up")}
                    title="Move slide up"
                    className={cn(
                      "grid flex-1 place-items-center border-b border-divider-main transition",
                      canMoveUp
                        ? "text-secondary-default hover:bg-secondary-default/15"
                        : "cursor-not-allowed text-grayout-main/25",
                    )}
                  >
                    <MaterialIcon name="keyboard_arrow_up" size={20} />
                  </button>
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    onClick={() => slideAuthoring?.moveSlide?.(slide.id, "down")}
                    title="Move slide down"
                    className={cn(
                      "grid flex-1 place-items-center transition",
                      canMoveDown
                        ? "text-secondary-default hover:bg-secondary-default/15"
                        : "cursor-not-allowed text-grayout-main/25",
                    )}
                  >
                    <MaterialIcon name="keyboard_arrow_down" size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
