import { Layers3 } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterVisualStateSection({
  chapter,
  saveVisualStateToActiveChapter,
}) {
  const hasSavedVisualState = Boolean(chapter?.visualState);

  return (
    <section className="space-y-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-normal text-contrast-grayout">
          Visual State
        </label>

        {hasSavedVisualState && (
          <span className="text-xs text-secondary-default">Saved</span>
        )}
      </div>

      <Button
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          saveVisualStateToActiveChapter?.();
        }}
      >
        <Layers3 className="mr-2 size-4" /> Save Visual State
      </Button>
    </section>
  );
}
