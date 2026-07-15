import { Layers3, Trash2 } from "lucide-react";
import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function ChapterVisualStateSection({
  chapter,
  saveVisualStateToActiveChapter,
  deleteVisualStateFromActiveChapter,
}) {
  const hasSavedVisualState = Boolean(chapter?.visualState);

  const handleSaveVisualState = (event) => {
    event.stopPropagation();
    saveVisualStateToActiveChapter?.();
  };

  const handleDeleteVisualState = (event) => {
    event.stopPropagation();
    deleteVisualStateFromActiveChapter?.();
  };

  return (
    <section className="space-y-3 p-4">
      <div className="text-sm font-normal text-contrast-grayout">
        Visual State
      </div>

      {!hasSavedVisualState ? (
        <div
          className={[
            "rounded-lg border border-dashed border-divider-main",
            "px-3 py-3",
            "text-sm text-contrast-grayout",
          ].join(" ")}
        >
          No visual state has been saved yet
        </div>
      ) : (
        <div
          onClick={(event) => event.stopPropagation()}
          className={[
            "flex min-h-11 items-center justify-between gap-3",
            "rounded-lg border border-secondary-default",
            "px-3 py-2",
            "text-sm text-white",
          ].join(" ")}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Layers3 className="size-4 shrink-0 text-secondary-default" />

            <span className="truncate">Visual State Saved</span>
          </div>

          <button
            type="button"
            title="Delete visual state"
            aria-label="Delete visual state"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleDeleteVisualState}
            className={[
              "grid size-8 shrink-0 cursor-pointer place-items-center",
              "rounded-lg text-secondary-default",
              "transition-colors",
              "hover:bg-white/5 hover:text-accent-main",
            ].join(" ")}
          >
            <MaterialIcon
              name="delete"
              fill={1}
              size={18}
              className="text-current"
            />
          </button>
        </div>
      )}

      <Button
        size="sm"
        type="button"
        variant="cyanOutline"
        onClick={handleSaveVisualState}
        className={[
          "h-10 gap-3 rounded-lg!",
          "bg-dark-alpha px-4",
          "text-sm font-normal text-white",
        ].join(" ")}
      >
        <Layers3 className="size-5 text-secondary-default" />
        Save Visual State
      </Button>
    </section>
  );
}
