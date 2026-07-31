import { Pause, Play } from "lucide-react";
import Button from "../ui/button";

export default function PlayerChapterPlaybackSection({
  activeChapter,
  material,
  onPlayAnimations,
  onStopAnimations,
  chapterFlowAssignments = [],
  activeChapterFlowIds = [],
  onPlayChapterFlow,
  onStopChapterFlows,
}) {
  const flows = material?.flows || [];
  const chapterFlows = chapterFlowAssignments
    .map((assignment) => ({
      assignment,
      flow: flows.find((flow) => flow.id === assignment.flowId) || null,
    }))
    .filter((item) => item.flow);
  const hasAnimations = activeChapter?.animations?.some((animation) =>
    typeof animation === "string" ? animation : animation?.name,
  );

  if (!hasAnimations && chapterFlows.length === 0) return null;

  return (
    <>
      {hasAnimations && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 text-xs font-normal text-white/60">
            Animation
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              className="flex-1"
              onClick={onPlayAnimations}
            >
              <Play className="size-4" />
              Play Animation
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={onStopAnimations}
            >
              <Pause className="size-4" />
              Stop
            </Button>
          </div>
        </section>
      )}

      {chapterFlows.length > 0 && (
        <section className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 text-xs font-normal text-white/60">Flow</div>

          <div className="space-y-2">
            {chapterFlows.map(({ assignment, flow }) => {
              const active = activeChapterFlowIds.includes(flow.id);
              const canPlay = (flow.points?.length || 0) >= 2;

              return (
                <div
                  key={assignment.assignmentId || flow.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-white">
                      {flow.name || "Untitled Flow"}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/45">
                      {assignment.autoPlay ? "Auto Play" : "Manual"}
                    </div>
                  </div>
                  <Button
                    size="xs"
                    type="button"
                    variant={active ? "default" : "outline"}
                    disabled={!canPlay}
                    onClick={() => onPlayChapterFlow?.(flow.id)}
                  >
                    <Play className="size-3.5" />
                    {active ? "Replay" : "Play"}
                  </Button>
                </div>
              );
            })}
          </div>

          {activeChapterFlowIds.length > 0 && (
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={onStopChapterFlows}
            >
              Stop Flow
            </Button>
          )}
        </section>
      )}
    </>
  );
}
