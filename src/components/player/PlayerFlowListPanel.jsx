import { Pause, Play, RotateCcw, X } from "lucide-react";
import { getFlowEffectLabel } from "../../engine/flow";
import {
  getLazyAwareMaterialRecordCount,
  isLazyMaterialRecord,
} from "../../engine/project/LazyMaterialRecords";
import Button from "../ui/button";

export default function PlayerFlowListPanel({
  flows = [],
  activeFlowId = null,
  isPlaying = false,
  onPlay,
  onStop,
  onClose,
}) {
  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[86px] border border-grayout-extra-dark top-6 z-50 flex max-h-[calc(100vh-48px)] w-[380px] flex-col overflow-hidden rounded-2xl bg-dark-alpha shadow-2xl backdrop-blur-2xl">
      <div className="flex items-start justify-between border-b border-grayout-dark px-5 py-4">
        <div>
          <h2 className="text-lg font-normal text-white">Flow Materials</h2>
          <p className="mt-1 text-xs text-contrast-grayout">
            Select and play a saved visual flow
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer grid size-9 place-items-center rounded-lg text-white/75 hover:bg-white/10"
          title="Close"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {flows.length === 0 ? (
          <div className="rounded-xl border border-grayout-dark p-5 text-center text-sm text-contrast-grayout">
            No flow material has been created yet.
          </div>
        ) : (
          flows.map((flow, index) => {
            const active = flow.id === activeFlowId;
            const isLazyFlow = isLazyMaterialRecord(flow, "flows");
            const pointCount = getLazyAwareMaterialRecordCount(flow, {
              arrayField: "points",
              countField: "pointCount",
              expectedType: "flows",
            });
            // Lazy records must stay clickable so Player can hydrate their
            // payload on demand, including older rows with stale counters.
            const canPlay = isLazyFlow || pointCount >= 2;

            return (
              <article
                key={flow.id}
                className={[
                  "rounded-xl border p-4 transition",
                  active
                    ? "border-accent-main bg-accent-main/10"
                    : "border-grayout-dark bg-primary/60",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-sm font-normal text-white">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-normal text-white">
                      {flow.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-contrast-grayout">
                      {flow.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-contrast-grayout">
                      <span>
                        {isLazyFlow && pointCount === 0
                          ? "Points load on play"
                          : `${pointCount} points`}
                      </span>
                      <span>
                        {getFlowEffectLabel(flow.settings?.effectType)}
                      </span>
                      <span>{flow.settings?.speed || 1}x speed</span>
                      <span>{flow.settings?.repeat ? "Repeat" : "Once"}</span>
                      {(flow.visualState || flow.hasVisualState) && (
                        <span>Saved State</span>
                      )}
                      {(flow.cameraView || flow.hasCameraView) && (
                        <span>Saved Camera</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={active && isPlaying ? "outline" : "default"}
                  disabled={!canPlay}
                  onClick={() => {
                    if (active && isPlaying) {
                      onStop?.();
                    } else {
                      onPlay?.(flow.id);
                    }
                  }}
                  className="w-full mt-4"
                >
                  {active && isPlaying ? (
                    <>
                      <Pause className="size-4" /> Stop Flow
                    </>
                  ) : active ? (
                    <>
                      <RotateCcw className="size-4" /> Replay Flow
                    </>
                  ) : (
                    <>
                      <Play className="size-4" /> Play Flow
                    </>
                  )}
                </Button>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
