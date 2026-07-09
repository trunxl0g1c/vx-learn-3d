import { ArrowRight, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import MaterialIcon from "../ui/material-icon";

function getProjectTitle(material) {
  return (
    material?.projectName ||
    material?.project?.name ||
    material?.title ||
    "Untitled Project"
  );
}

function FooterButton({ icon: Icon, label, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-xs font-bold transition",
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : "cursor-pointer border-secondary-default/50 text-secondary-default hover:border-secondary-default hover:bg-secondary-default hover:text-primary",
      ].join(" ")}
      title={label}
    >
      {Icon && <Icon className="size-4" />}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export default function PlayerChapterListPanel({
  material,
  activeChapterId,
  handleSelectChapter,
  onClose,
}) {
  if (!material) return null;

  const chapters = material.chapters || [];
  const activeChapterIndex = chapters.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const canGoPrevious = activeChapterIndex > 0;
  const canGoNext =
    activeChapterIndex >= 0 && activeChapterIndex < chapters.length - 1;

  const handlePrevious = () => {
    if (!canGoPrevious) return;
    handleSelectChapter?.(chapters[activeChapterIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    handleSelectChapter?.(chapters[activeChapterIndex + 1].id);
  };

  return (
    <aside
      onClick={(event) => event.stopPropagation()}
      className={[
        "absolute left-[92px] top-7 z-40 flex max-h-[80vh] w-[420px] flex-col overflow-hidden",
        "rounded-2xl border border-white/10 bg-[#182223]/75 p-5 text-white shadow-2xl",
        "backdrop-blur-xl backdrop-saturate-200",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onClose}
        className="grid absolute right-4 top-4 size-8 cursor-pointer place-items-center rounded-lg text-white hover:bg-white/10"
        title="Close"
      >
        <X className="size-5" />
      </button>

      <h3 className="mb-6 pr-8 text-base font-bold leading-tight text-white">
        {getProjectTitle(material)}
      </h3>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {chapters.map((chapter, index) => {
          const active = activeChapterId === chapter.id;

          return (
            <button
              key={chapter.id || `${chapter.title}-${index}`}
              type="button"
              onClick={() => handleSelectChapter?.(chapter.id)}
              className={[
                "cursor-pointer grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                active
                  ? "border-secondary-default/70 bg-white/[0.08] text-white"
                  : "border-white/10 bg-white/[0.03] text-white/75 hover:border-secondary-default/60 hover:bg-secondary-default/10 hover:text-white",
              ].join(" ")}
            >
              <span className="text-xs tabular-nums text-white/55">
                {index + 1}.
              </span>

              <span className="min-w-0 truncate text-sm font-normal">
                {chapter.title || `Chapter ${index + 1}`}
              </span>

              <MaterialIcon
                name="arrow_right_alt"
                fill
                size={20}
                className="text-secondary-default"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-between items-center border-t border-white/10 pt-4">
        <PanelFooterButton
          icon={List}
          // label="List"
          disabled
        />
        <div className="flex gap-2">
          <PanelFooterButton
            onClick={handlePrevious}
            icon={ChevronLeft}
            // label="Previous Chapter"
            disabled={!canGoPrevious}
          />
          <PanelFooterButton
            onClick={handleNext}
            icon={ChevronRight}
            // label="Next"
            disabled={!canGoNext}
          />
        </div>
      </div>
    </aside>
  );
}

function PanelFooterButton({ icon: Icon, label, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex rounded-full h-9 p-2 items-center justify-center gap-2 border text-xs font-normal transition",
        disabled
          ? "cursor-not-allowed border-white/10 text-white/30"
          : "cursor-pointer border-grayout-dark text-white hover:border-grayout-dark/80 hover:bg-dark-alpha/80",
      ].join(" ")}
    >
      {Icon && <Icon className="size-4" />}
      {/* <span>{label}</span> */}
    </button>
  );
}
