import { Play } from "lucide-react";
import Button from "../../ui/button";
import Checkbox from "../../ui/checkbox";

export default function ChapterAnimationSection({
  chapter,
  animations,
  isChapterAnimationSelected,
  getChapterAnimationConfig,
  toggleChapterAnimation,
  updateChapterAnimationField,
  playAnimationPreview,
  stopAnimationPreview,
}) {
  return (
    <section className="space-y-3 px-4 pb-4">
      <div className="text-xs font-bold text-contrast-grayout">Animation</div>

      {animations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-xs leading-5 text-contrast-grayout">
          Tidak ada animasi yang terdeteksi pada file GLB ini.
        </div>
      ) : (
        <>
          <div className="sidebar-scroll max-h-[180px] overflow-y-auto rounded-lg border border-divider-main">
            {animations.map((anim) => {
              const selected = isChapterAnimationSelected(chapter, anim.name);
              const config = getChapterAnimationConfig(chapter, anim.name);

              return (
                <div
                  key={anim.name}
                  onClick={(e) => e.stopPropagation()}
                  className={[
                    "grid grid-cols-[24px_1fr_64px_72px] items-center gap-2 border-b border-divider-main p-2 last:border-b-0",
                    selected ? "bg-accent-main/25" : "bg-transparent",
                  ].join(" ")}
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) =>
                      toggleChapterAnimation(chapter.id, anim.name, checked)
                    }
                  />

                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {anim.name}
                    </div>
                    <div className="text-[11px] text-contrast-grayout">
                      {anim.duration?.toFixed?.(2) || 0}s
                    </div>
                  </div>

                  <Checkbox
                    label="Loop"
                    checked={config.loop || false}
                    disabled={!selected}
                    onCheckedChange={(checked) =>
                      updateChapterAnimationField(
                        chapter.id,
                        anim.name,
                        "loop",
                        checked,
                      )
                    }
                    labelClassName={
                      selected
                        ? "text-[11px] text-white"
                        : "text-[11px] text-contrast-grayout"
                    }
                  />

                  <Checkbox
                    label="Auto"
                    checked={config.autoPlay || false}
                    disabled={!selected}
                    onCheckedChange={(checked) =>
                      updateChapterAnimationField(
                        chapter.id,
                        anim.name,
                        "autoPlay",
                        checked,
                      )
                    }
                    labelClassName={
                      selected
                        ? "text-[11px] text-white"
                        : "text-[11px] text-contrast-grayout"
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                playAnimationPreview(chapter);
              }}
            >
              <Play className="size-4" />
              Preview
            </Button>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                stopAnimationPreview();
              }}
            >
              Stop
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
