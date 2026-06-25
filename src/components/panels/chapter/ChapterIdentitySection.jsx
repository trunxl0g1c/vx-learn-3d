import { Minus } from "lucide-react";
import Input from "../../ui/input";

export default function ChapterIdentitySection({
  chapter,
  setActiveChapterId,
  updateChapterField,
}) {
  const titleLength = chapter.title?.length || 0;

  return (
    <section className="py-2 px-4">
      {/* <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveChapterId(null);
        }}
        className="flex h-14 w-full items-center justify-between px-4 text-left"
      >

        <span className="truncate text-sm font-bold text-white">
          {chapter.objectName || "Object"}
        </span>
        <Minus className="size-5 text-secondary-default" />
        </button> */}

      <span className="truncate text-base font-bold text-white mb-3">
        {chapter.objectName || "Object"}
      </span>

      <div className="space-y-3 mt-4">
        <div>
          <label className="mb-2 block text-xs font-semibold text-contrast-grayout">
            Alias Name
          </label>

          <div className="relative">
            <Input
              value={chapter.title || ""}
              maxLength={48}
              placeholder="Alias name"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateChapterField(chapter.id, "title", e.target.value)
              }
              className="h-[44px] rounded-lg"
              inputClassName="text-xs"
            />

            <span className="absolute bottom-2 right-3 text-[9px] font-semibold text-contrast-grayout">
              {titleLength}/48
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
