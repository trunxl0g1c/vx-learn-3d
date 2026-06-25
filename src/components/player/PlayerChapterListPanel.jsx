import Button from "../ui/button";

export default function PlayerChapterListPanel({
  material,
  activeChapterId,
  handleSelectChapter,
}) {
  if (!material) return null;

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      className={[
        "absolute left-0 top-0 z-[110]",
        "flex w-[380px] h-full flex-col overflow-hidden",
        "border border-divider-main",
        "bg-primary/75 text-white",
        "backdrop-blur-sm backdrop-saturate-200",
      ].join(" ")}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-divider-main bg-dark-alpha/80 px-5">
        <div>
          <div className="text-lg font-semibold">Chapters</div>

          <div className="text-xs text-contrast-grayout">
            {material.chapters.length} Chapters Available
          </div>
        </div>
      </div>

      <div className="sidebar-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {material.chapters.map((chapter, index) => {
          const active = activeChapterId === chapter.id;

          return (
            <button
              key={chapter.id}
              onClick={() => handleSelectChapter(chapter.id)}
              className={[
                "group w-full rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-secondary-default bg-secondary-default/20"
                  : "border-divider-main bg-primary/60 hover:border-secondary-default/60 hover:bg-primary/80",
              ].join(" ")}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    active
                      ? "bg-secondary-default text-white"
                      : "bg-dark-alpha text-contrast-grayout",
                  ].join(" ")}
                >
                  Chapter {index + 1}
                </span>

                {active && (
                  <span className="text-xs font-semibold text-secondary-default">
                    ACTIVE
                  </span>
                )}
              </div>

              <h3 className="line-clamp-2 text-base font-semibold text-white">
                {chapter.title}
              </h3>

              <p className="mt-2 text-xs text-contrast-grayout">Object</p>

              <div className="truncate text-sm text-white">
                {chapter.objectName}
              </div>

              {chapter.description && (
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-contrast-grayout">
                  {chapter.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {chapter.parameters?.length > 0 && (
                    <div className="rounded-md bg-dark-alpha px-2 py-1 text-[10px] font-semibold text-secondary-default">
                      {chapter.parameters.length} Params
                    </div>
                  )}

                  {chapter.animations?.length > 0 && (
                    <div className="rounded-md bg-dark-alpha px-2 py-1 text-[10px] font-semibold text-secondary-default">
                      {chapter.animations.length} Anim
                    </div>
                  )}
                </div>

                <Button size="sm" variant={active ? "default" : "outline"}>
                  {active ? "Selected" : "Open"}
                </Button>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
