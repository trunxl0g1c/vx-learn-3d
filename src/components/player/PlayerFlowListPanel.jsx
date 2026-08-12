import { Pause, Play, RotateCcw, X } from "lucide-react";
import { getFlowEffectLabel } from "../../engine/flow";
import {
  getLazyAwareMaterialRecordCount,
  isLazyMaterialRecord,
} from "../../engine/project/LazyMaterialRecords";

export default function PlayerFlowListPanel({
  flows = [],
  activeFlowId = null,
  isPlaying = false,
  onPlay,
  onStop,
  onClose,
}) {
  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[86px] top-6 z-50 flex max-h-[calc(100vh-48px)] w-[380px] flex-col overflow-hidden rounded-2xl border border-grayout-dark bg-dark-alpha shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-grayout-dark px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Flow Materials</h2>
          <p className="mt-1 text-xs text-contrast-grayout">
            Select and play a saved visual flow
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-lg text-secondary-default hover:bg-white/10"
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
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-sm font-bold text-white">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
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
                      <span>{getFlowEffectLabel(flow.settings?.effectType)}</span>
                      <span>{flow.settings?.speed || 1}x speed</span>
                      <span>{flow.settings?.repeat ? "Repeat" : "Once"}</span>
                      {(flow.visualState || flow.hasVisualState) && <span>Saved State</span>}
                      {(flow.cameraView || flow.hasCameraView) && <span>Saved Camera</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canPlay}
                  onClick={() => {
                    if (active && isPlaying) {
                      onStop?.();
                    } else {
                      onPlay?.(flow.id);
                    }
                  }}
                  className={[
                    "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition",
                    active && isPlaying
                      ? "border-red-400/50 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      : "border-secondary-default/60 bg-primary text-secondary-default hover:bg-white/10",
                    !canPlay ? "cursor-not-allowed opacity-40" : "",
                  ].join(" ")}
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
                </button>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
