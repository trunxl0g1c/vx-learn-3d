import { CheckCircle2, Pause, Play, RotateCcw, X } from "lucide-react";
import {
  getLazyAwareMaterialRecordCount,
  isLazyMaterialRecord,
} from "../../engine/project/LazyMaterialRecords";
import Button from "../ui/button";

function getAnimatedEntries(step) {
  if (Array.isArray(step?.animatedObjects) && step.animatedObjects.length > 0) {
    return step.animatedObjects;
  }

  return step?.animatedObject
    ? [
        {
          object: step.animatedObject,
          startTransform: step.startTransform,
          endTransform: step.endTransform,
        },
      ]
    : [];
}

function getClickTargets(step) {
  if (Array.isArray(step?.clickTargets) && step.clickTargets.length > 0) {
    return step.clickTargets;
  }

  return step?.targetObject ? [step.targetObject] : [];
}

export default function PlayerProceduralListPanel({
  procedures = [],
  activeProcedureId = null,
  activeSteps = [],
  status = "idle",
  activeStepIndex = -1,
  completedStepIds = [],
  feedback = "",
  onPlay,
  onReplay,
  onStop,
  onPlayCompletionAnimation,
  onClose,
}) {
  const completedSet = new Set(completedStepIds || []);

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[86px] top-6 z-50 flex max-h-[calc(100vh-48px)] w-[400px] flex-col overflow-hidden rounded-2xl border border-grayout-extra-dark bg-dark-alpha shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-grayout-dark px-5 py-4">
        <div>
          <h2 className="text-lg font-normal text-white">Procedures</h2>
          <p className="mt-1 text-xs text-contrast-grayout">
            Complete guided or assembly steps in order
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
        {procedures.length === 0 ? (
          <div className="rounded-xl border border-grayout-dark p-5 text-center text-sm text-contrast-grayout">
            No procedure has been created yet.
          </div>
        ) : (
          procedures.map((procedure, procedureIndex) => {
            const active = procedure.id === activeProcedureId;
            const isLazyProcedure = isLazyMaterialRecord(
              procedure,
              "procedures",
            );
            const enabledSteps = (procedure.steps || []).filter(
              (step) => step.enabled !== false,
            );
            const playbackSteps =
              active && Array.isArray(activeSteps) && activeSteps.length > 0
                ? activeSteps
                : enabledSteps;
            const stepCount = getLazyAwareMaterialRecordCount(procedure, {
              arrayField: "steps",
              countField: "stepCount",
              expectedType: "procedures",
            });
            const isAssembly = procedure.type === "assembly";
            const canPlay = isLazyProcedure
              ? true
              : enabledSteps.length > 0 &&
                enabledSteps.every((step) => {
                  const clickTargets = getClickTargets(step);
                  const animatedEntries = getAnimatedEntries(step);

                  return (
                    clickTargets.length > 0 &&
                    animatedEntries.length > 0 &&
                    animatedEntries.every(
                      (entry) => entry.startTransform && entry.endTransform,
                    ) &&
                    (!isAssembly || step.cameraView)
                  );
                });
            const isPreparing = active && status === "resetting";
            const isRunning =
              active && ["waiting", "dragging", "animating"].includes(status);
            const isCompleted = active && status === "completed";
            const completionAnimation = procedure.settings?.completionAnimation;
            const hasCompletionAnimation = Boolean(completionAnimation?.name);
            const currentStep = active ? playbackSteps[activeStepIndex] : null;
            const currentClickTargets = getClickTargets(currentStep);

            return (
              <article
                key={procedure.id}
                className={[
                  "rounded-xl border p-4 transition",
                  active
                    ? "border-accent-main bg-accent-main/10"
                    : "border-grayout-dark bg-primary/60",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-sm font-normal text-white">
                    {procedureIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-normal text-white">
                      {procedure.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-contrast-grayout">
                      {procedure.description || "No description"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-contrast-grayout">
                      <span>
                        {isLazyProcedure && stepCount === 0
                          ? "Steps load on play"
                          : `${stepCount} ${
                              isAssembly ? "assembly" : "interactive"
                            } steps`}
                      </span>
                    </div>
                  </div>
                </div>

                {active && (
                  <div className="mt-4 rounded-lg border border-secondary-default/30 bg-primary/70 p-3">
                    {status === "completed" ? (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-green-200">
                          <CheckCircle2 className="size-5" />
                          {isAssembly
                            ? "Assembly completed"
                            : "Procedure completed"}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-contrast-grayout">
                          Semua object dapat dikembalikan ke posisi awal dan
                          procedure dapat dijalankan kembali.
                        </p>
                        {hasCompletionAnimation && (
                          <Button
                            size="xs"
                            type="button"
                            onClick={() =>
                              onPlayCompletionAnimation?.(procedure.id)
                            }
                          >
                            <Play className="size-4" />
                            Play {completionAnimation.name}
                          </Button>
                        )}
                      </div>
                    ) : isPreparing ? (
                      <div className="flex items-center gap-3 text-sm text-secondary-default">
                        <span className="size-4 animate-spin rounded-full border-2 border-secondary-default/30 border-t-secondary-default" />
                        Preparing procedure replay...
                      </div>
                    ) : currentStep ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-normal text-white">
                            Step {activeStepIndex + 1} of {playbackSteps.length}
                          </p>
                          <span className="text-[10px] uppercase tracking-wide text-secondary-default">
                            {status === "animating"
                              ? "Animating"
                              : status === "dragging"
                                ? "Dragging component"
                                : isAssembly
                                  ? "Drag to target"
                                  : "Waiting for any target click"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-normal text-white">
                          {currentStep.name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-contrast-grayout">
                          {currentStep.instruction}
                        </p>
                        <div className="mt-2 space-y-1 text-[10px] text-contrast-grayout">
                          {isAssembly ? (
                            <>
                              <p>
                                Component:{" "}
                                {currentStep.animatedObject?.name ||
                                  currentStep.targetObject?.name ||
                                  "Unknown"}
                              </p>
                              <p>Camera: saved POV locked</p>
                            </>
                          ) : (
                            <>
                              <p>
                                Click any:{" "}
                                {currentClickTargets
                                  .map((entry) => entry?.name)
                                  .filter(Boolean)
                                  .join(", ") || "Unknown"}
                              </p>
                              <p>
                                Animate:{" "}
                                {getAnimatedEntries(currentStep)
                                  .map((entry) => entry.object?.name)
                                  .filter(Boolean)
                                  .join(", ") || "Unknown"}
                              </p>
                            </>
                          )}
                        </div>
                      </>
                    ) : null}

                    {feedback && (
                      <p className="mt-3 rounded-lg border border-warning-main/40 bg-warning-main/10 px-3 py-2 text-xs text-warning-main">
                        {feedback}
                      </p>
                    )}

                    <div className="mt-3 flex gap-1.5">
                      {playbackSteps.map((step, index) => (
                        <span
                          key={step.id}
                          title={step.name}
                          className={[
                            "h-1.5 flex-1 rounded-full",
                            completedSet.has(step.id)
                              ? "bg-green-400"
                              : index === activeStepIndex
                                ? "bg-secondary-default"
                                : "bg-white/15",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  type="button"
                  disabled={!canPlay || isPreparing}
                  onClick={() => {
                    if (isRunning) {
                      onStop?.();
                      return;
                    }

                    if (isCompleted) {
                      onReplay?.(procedure.id);
                      return;
                    }

                    onPlay?.(procedure.id);
                  }}
                  variant={isRunning ? "destructive" : "default"}
                  className="w-full mt-5"
                >
                  {isPreparing ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                      Preparing
                    </>
                  ) : isRunning ? (
                    <>
                      <Pause className="size-4" /> Stop
                    </>
                  ) : isCompleted ? (
                    <>
                      <RotateCcw className="size-4" /> Replay
                    </>
                  ) : active ? (
                    <>
                      <RotateCcw className="size-4" /> Restart
                    </>
                  ) : (
                    <>
                      <Play className="size-4" /> Start
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
