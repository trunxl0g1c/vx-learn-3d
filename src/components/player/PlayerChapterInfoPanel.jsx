import { Pause, Play, Volume2 } from "lucide-react";
import Button from "../ui/button";

export default function PlayerChapterInfoPanel({
  activeChapter,
  speakChapterDescription,
  stopSpeaking,
  playChapterAnimations,
  stopChapterAnimations,
}) {
  if (!activeChapter) return null;

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      className={[
        "absolute right-0 top-0 bottom-0 z-[110] flex w-[420px] flex-col overflow-hidden",
        "border border-divider-main text-white",
        "bg-primary/75 backdrop-blur-sm backdrop-saturate-200",
      ].join(" ")}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-divider-main bg-dark-alpha/80 px-5 text-lg font-semibold">
        Chapter Info
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-5">
          <div className="mb-2 text-xs font-bold text-contrast-grayout">
            Object
          </div>

          <div className="rounded-lg border border-divider-main bg-primary/80 px-3 py-2 text-sm font-semibold text-white">
            {activeChapter.objectName || "-"}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 text-xs font-bold text-contrast-grayout">
            Title
          </div>

          <h2 className="text-xl font-bold leading-snug text-white">
            {activeChapter.title || "Untitled Chapter"}
          </h2>
        </div>

        <div className="mb-5 flex gap-3">
          <Button onClick={speakChapterDescription} className="flex-1 gap-2">
            <Volume2 className="size-4" />
            Play Voice
          </Button>

          <Button
            variant="outline"
            onClick={stopSpeaking}
            className="flex-1 gap-2"
          >
            <Pause className="size-4" />
            Stop
          </Button>
        </div>

        <div className="mb-6">
          <div className="mb-2 text-xs font-bold text-contrast-grayout">
            Description
          </div>

          <div className="rounded-lg border border-secondary-default bg-primary/80 p-3 text-sm leading-6 text-white whitespace-pre-line">
            {activeChapter.description || "Belum ada deskripsi."}
          </div>
        </div>

        {activeChapter?.parameters?.length > 0 && (
          <section className="mb-6 border-t border-divider-main pt-4">
            <div className="mb-3 text-xs font-bold text-contrast-grayout">
              Parameters
            </div>

            <div className="space-y-2">
              {activeChapter.parameters.map((parameter, index) => {
                const label =
                  parameter.name || parameter.label || `Parameter ${index + 1}`;
                const value = parameter.value || "-";
                const unit = parameter.unit || "";

                return (
                  <div
                    key={parameter.id || `${label}-${index}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-divider-main bg-primary/80 px-3 py-2 text-sm"
                  >
                    <span className="text-contrast-grayout">{label}</span>

                    <strong className="text-right text-white">
                      {value}
                      {unit ? ` ${unit}` : ""}
                    </strong>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeChapter?.animations?.length > 0 && (
          <section className="border-t border-divider-main pt-4">
            <div className="mb-3 text-xs font-bold text-contrast-grayout">
              Animation
            </div>

            <div className="mb-4 space-y-2">
              {activeChapter.animations.map((animation, index) => {
                const name =
                  typeof animation === "string"
                    ? animation
                    : animation?.name || `Animation ${index + 1}`;

                const loop =
                  typeof animation === "string"
                    ? false
                    : Boolean(animation?.loop);

                return (
                  <div
                    key={`${name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-divider-main bg-primary/80 px-3 py-2 text-sm"
                  >
                    <strong className="truncate text-white">{name}</strong>

                    {loop && (
                      <span className="rounded-full border border-secondary-default px-2 py-0.5 text-[10px] font-bold text-secondary-default">
                        Loop
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 w-full">
              <Button onClick={playChapterAnimations} className="flex-1 gap-2 w-2/3">
                <Play className="size-4" />
                Play Animation
              </Button>

              <Button
                variant="outline"
                onClick={stopChapterAnimations}
                className="w-1/3"
              >
                Stop
              </Button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
