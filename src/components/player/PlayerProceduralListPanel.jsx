import { CheckCircle2, Pause, Play, RotateCcw, X } from "lucide-react";

function getAnimatedEntries(step) {
  if (Array.isArray(step?.animatedObjects) && step.animatedObjects.length > 0) {
    return step.animatedObjects;
  }

  return step?.animatedObject
    ? [{
        object: step.animatedObject,
        startTransform: step.startTransform,
        endTransform: step.endTransform,
      }]
    : [];
}


export default function PlayerProceduralListPanel({
  procedures = [],
  activeProcedureId = null,
  status = "idle",
  activeStepIndex = -1,
  completedStepIds = [],
  feedback = "",
  onPlay,
  onStop,
  onPlayCompletionAnimation,
  onClose,
}) {
  const completedSet = new Set(completedStepIds || []);

  return (
    <aside className="vx-player-panel vx-player-panel--full-mobile absolute left-[86px] top-6 z-50 flex max-h-[calc(100vh-48px)] w-[400px] flex-col overflow-hidden rounded-2xl border border-grayout-dark bg-dark-alpha shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-grayout-dark px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Procedures</h2>
          <p className="mt-1 text-xs text-contrast-grayout">
            Complete guided or assembly steps in order
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
        {procedures.length === 0 ? (
          <div className="rounded-xl border border-grayout-dark p-5 text-center text-sm text-contrast-grayout">
            No procedure has been created yet.
          </div>
        ) : (
          procedures.map((procedure, procedureIndex) => {
            const active = procedure.id === activeProcedureId;
            const enabledSteps = (procedure.steps || []).filter(
              (step) => step.enabled !== false,
            );
            const isAssembly = procedure.type === "assembly";
            const canPlay =
              enabledSteps.length > 0 &&
              enabledSteps.every((step) => {
                const animatedEntries = getAnimatedEntries(step);
                return (
                  step.targetObject &&
                  animatedEntries.length > 0 &&
                  animatedEntries.every(
                    (entry) => entry.startTransform && entry.endTransform,
                  ) &&
                  (!isAssembly || step.cameraView)
                );
              });
            const isRunning =
              active && ["waiting", "dragging", "animating"].includes(status);
            const completionAnimation = procedure.settings?.completionAnimation;
            const hasCompletionAnimation = Boolean(completionAnimation?.name);
            const currentStep = active ? enabledSteps[activeStepIndex] : null;

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
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-main text-sm font-bold text-white">
                    {procedureIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {procedure.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-contrast-grayout">
                      {procedure.description || "No description"}
                    </p>
                    <div className="mt-2 text-[10px] text-contrast-grayout">
                      {enabledSteps.length} {isAssembly ? "assembly" : "interactive"} steps
                    </div>
                  </div>
                </div>

                {active && (
                  <div className="mt-4 rounded-lg border border-secondary-default/30 bg-primary/70 p-3">
                    {status === "completed" ? (
                      <div>
                        <div className="flex items-center gap-2 text-sm text-green-200">
                          <CheckCircle2 className="size-5" /> {isAssembly ? "Assembly completed" : "Procedure completed"}
                        </div>
                        {hasCompletionAnimation && (
                          <button
                            type="button"
                            onClick={() => onPlayCompletionAnimation?.(procedure.id)}
                            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-secondary-default/60 bg-primary text-xs font-semibold text-secondary-default transition hover:bg-white/10"
                          >
                            <Play className="size-4" />
                            Play {completionAnimation.name}
                          </button>
                        )}
                      </div>
                    ) : currentStep ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-white">
                            Step {activeStepIndex + 1} of {enabledSteps.length}
                          </p>
                          <span className="text-[10px] uppercase tracking-wide text-secondary-default">
                            {status === "animating"
                              ? "Animating"
                              : status === "dragging"
                                ? "Dragging component"
                                : isAssembly
                                  ? "Drag to target"
                                  : "Waiting for click"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {currentStep.name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-contrast-grayout">
                          {currentStep.instruction}
                        </p>
                        <div className="mt-2 space-y-1 text-[10px] text-contrast-grayout">
                          {isAssembly ? (
                            <>
                              <p>
                                Component: {currentStep.animatedObject?.name || currentStep.targetObject?.name || "Unknown"}
                              </p>
                              <p>Camera: saved POV locked</p>
                            </>
                          ) : (
                            <>
                              <p>Click: {currentStep.targetObject?.name || "Unknown"}</p>
                              <p>
                                Animate: {getAnimatedEntries(currentStep)
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
                      {enabledSteps.map((step, index) => (
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

                <button
                  type="button"
                  disabled={!canPlay}
                  onClick={() => {
                    if (isRunning) onStop?.();
                    else onPlay?.(procedure.id);
                  }}
                  className={[
                    "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition",
                    isRunning
                      ? "border-red-400/50 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      : "border-secondary-default/60 bg-primary text-secondary-default hover:bg-white/10",
                    !canPlay ? "cursor-not-allowed opacity-40" : "",
                  ].join(" ")}
                >
                  {isRunning ? (
                    <>
                      <Pause className="size-4" /> Stop
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
                </button>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
