import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { Section, StatusBadge } from "./PanelPrimitives";

function getStepClickTargets(procedural, item, isAssembly) {
  const normalized =
    procedural?.normalizeClickTargets?.(item, isAssembly) || [];

  if (normalized.length > 0) return normalized;
  return item?.targetObject ? [item.targetObject] : [];
}

function getStepReadyState(procedural, item, isAssembly) {
  const clickTargets = getStepClickTargets(procedural, item, isAssembly);
  const animatedEntries =
    procedural?.normalizeAnimatedObjects?.(item, isAssembly) ||
    item.animatedObjects ||
    [];

  return Boolean(
    clickTargets.length > 0 &&
      animatedEntries.length > 0 &&
      animatedEntries.every(
        (entry) => entry.startTransform && entry.endTransform,
      ) &&
      (!isAssembly || item.cameraView),
  );
}

export default function ProcedureStepListSection({
  procedural,
  procedure,
  isAssembly,
  onOpenStep,
}) {
  const steps = procedure.steps || [];
  const [draggingStepId, setDraggingStepId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const dropTargetRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const dragPreviewElementRef = useRef(null);
  const dragFrameRef = useRef(0);

  const draggingStep = useMemo(
    () => steps.find((step) => step.id === draggingStepId) || null,
    [draggingStepId, steps],
  );
  const draggingStepIndex = draggingStep
    ? steps.findIndex((step) => step.id === draggingStep.id)
    : -1;
  const draggingClickTargets = draggingStep
    ? getStepClickTargets(procedural, draggingStep, isAssembly)
    : [];
  const draggingAnimatedEntries = draggingStep
    ? procedural?.normalizeAnimatedObjects?.(draggingStep, isAssembly) || []
    : [];
  const draggingReady = draggingStep
    ? getStepReadyState(procedural, draggingStep, isAssembly)
    : false;
  const draggingAnimationMode =
    draggingStep?.action?.animatedObjectMode === "sequential"
      ? "Sequential"
      : "Together";

  useEffect(() => {
    if (!draggingStepId) return undefined;

    const updatePreviewPosition = (clientX, clientY) => {
      const preview = dragPreviewRef.current;
      if (!preview) return;

      preview.clientX = clientX;
      preview.clientY = clientY;

      if (dragFrameRef.current) return;

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = 0;
        const element = dragPreviewElementRef.current;
        const current = dragPreviewRef.current;
        if (!element || !current) return;

        const left = current.clientX - current.offsetX;
        const top = current.clientY - current.offsetY;
        element.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      });
    };

    const handlePointerMove = (event) => {
      event.preventDefault();
      updatePreviewPosition(event.clientX, event.clientY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const stepElement = element?.closest?.("[data-procedure-step-id]");
      const targetStepId = stepElement?.dataset?.procedureStepId || null;

      if (!targetStepId || targetStepId === draggingStepId) {
        if (dropTargetRef.current) {
          dropTargetRef.current = null;
          setDropTarget(null);
        }
        return;
      }

      const rect = stepElement.getBoundingClientRect();
      const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      const currentTarget = dropTargetRef.current;

      if (
        currentTarget?.stepId === targetStepId &&
        currentTarget?.placement === placement
      ) {
        return;
      }

      const nextDropTarget = { stepId: targetStepId, placement };
      dropTargetRef.current = nextDropTarget;
      setDropTarget(nextDropTarget);
    };

    const finishDrag = () => {
      const activeDropTarget = dropTargetRef.current;

      if (activeDropTarget?.stepId) {
        procedural.reorderStep?.(
          draggingStepId,
          activeDropTarget.stepId,
          activeDropTarget.placement,
        );
      }

      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = 0;
      }

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragPreviewRef.current = null;
      dropTargetRef.current = null;
      setDragPreview(null);
      setDraggingStepId(null);
      setDropTarget(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      if (dragFrameRef.current) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = 0;
      }
    };
  }, [draggingStepId, procedural.reorderStep]);

  return (
    <Section title="Procedure Steps">
      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={procedural.createStep}
      >
        {isAssembly ? "Add Assembly Step" : "Add Procedure Step"}
        <MaterialIcon name="add_task" size={20} />
      </Button>

      <div className="mt-3 space-y-2">
        {steps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-accent-main/50 p-4 text-center text-xs text-contrast-grayout">
            {isAssembly
              ? "No steps yet. Add the first component to install."
              : "No steps yet. Add the first object interaction."}
          </div>
        ) : (
          steps.map((item, index) => {
            const active = item.id === procedural.activeStepId;
            const ready = getStepReadyState(procedural, item, isAssembly);
            const clickTargets = getStepClickTargets(
              procedural,
              item,
              isAssembly,
            );
            const animatedEntries =
              procedural?.normalizeAnimatedObjects?.(item, isAssembly) || [];
            const animationMode =
              item.action?.animatedObjectMode === "sequential"
                ? "Sequential"
                : "Together";
            const isDragging = draggingStepId === item.id;
            const showDropBefore =
              dropTarget?.stepId === item.id && dropTarget.placement === "before";
            const showDropAfter =
              dropTarget?.stepId === item.id && dropTarget.placement === "after";

            return (
              <div
                key={item.id}
                data-procedure-step-id={item.id}
                className="relative"
              >
                {showDropBefore && (
                  <div className="pointer-events-none absolute -top-1.5 left-2 right-2 z-10 h-0.5 rounded-full bg-secondary-default shadow-[0_0_8px_rgba(86,205,223,0.75)]" />
                )}

                <div
                  data-procedure-step-card
                  className={[
                    "flex items-stretch gap-2 rounded-lg border p-2 transition",
                    active
                      ? "border-accent-main bg-accent-main/10"
                      : "border-secondary-default/40 bg-primary/50 hover:border-secondary-default",
                    isDragging
                      ? "border-dashed opacity-20"
                      : "opacity-100",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (draggingStepId) return;
                      procedural.setActiveStepId(item.id);
                      onOpenStep?.();
                    }}
                    className="cursor-pointer flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-normal text-white">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-normal text-white">
                        {item.name}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-contrast-grayout">
                        {isAssembly ? "Part" : "Click"}: {" "}
                        {isAssembly
                          ? clickTargets[0]?.name || "not assigned"
                          : clickTargets.length > 0
                            ? `${clickTargets.length} target${clickTargets.length === 1 ? "" : "s"}`
                            : "not assigned"}
                      </span>
                      {!isAssembly && (
                        <span className="mt-0.5 block truncate text-[10px] text-contrast-grayout">
                          Actions: {animatedEntries.length || 0} · {animationMode}
                        </span>
                      )}
                    </span>
                    <StatusBadge ready={ready}>
                      {ready ? "Ready" : "Setup"}
                    </StatusBadge>
                  </button>

                  <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-divider-main pl-2">
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        if (event.button !== undefined && event.button !== 0) return;
                        event.preventDefault();
                        event.stopPropagation();

                        const card = event.currentTarget.closest(
                          "[data-procedure-step-card]",
                        );
                        const rect = card?.getBoundingClientRect();
                        if (!rect) return;

                        const preview = {
                          width: rect.width,
                          height: rect.height,
                          offsetX: event.clientX - rect.left,
                          offsetY: event.clientY - rect.top,
                          clientX: event.clientX,
                          clientY: event.clientY,
                        };

                        document.body.style.cursor = "grabbing";
                        document.body.style.userSelect = "none";
                        dragPreviewRef.current = preview;
                        dropTargetRef.current = null;
                        setDragPreview(preview);
                        setDraggingStepId(item.id);
                        setDropTarget(null);
                      }}
                      className="grid size-7 touch-none cursor-grab place-items-center rounded-md text-secondary-default transition hover:bg-white/10 active:cursor-grabbing"
                      title={`Drag step ${index + 1} to reorder`}
                      aria-label={`Drag step ${index + 1} to reorder`}
                    >
                      <MaterialIcon name="drag_indicator" size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => procedural.deleteStep(item.id)}
                      className="cursor-pointer grid size-7 place-items-center rounded-md text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                      title="Delete step"
                      aria-label={`Delete step ${index + 1}`}
                    >
                      <MaterialIcon name="delete" size={20} />
                    </button>
                  </div>
                </div>

                {showDropAfter && (
                  <div className="pointer-events-none absolute -bottom-1.5 left-2 right-2 z-10 h-0.5 rounded-full bg-secondary-default shadow-[0_0_8px_rgba(86,205,223,0.75)]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {dragPreview && draggingStep && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dragPreviewElementRef}
            className="pointer-events-none fixed left-0 top-0 z-[1200] will-change-transform"
            style={{
              width: `${dragPreview.width}px`,
              transform: `translate3d(${
                dragPreview.clientX - dragPreview.offsetX
              }px, ${dragPreview.clientY - dragPreview.offsetY}px, 0)`,
            }}
            aria-hidden="true"
          >
            <div className="scale-[1.035] -rotate-[0.35deg] rounded-lg border border-secondary-default bg-[#171b1b]/95 p-2 opacity-95 shadow-2xl ring-1 ring-secondary-default/30 backdrop-blur-sm">
              <div className="flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
                    {draggingStepIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white">
                      {draggingStep.name}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-contrast-grayout">
                      {isAssembly ? "Part" : "Click"}: {" "}
                      {isAssembly
                        ? draggingClickTargets[0]?.name || "not assigned"
                        : draggingClickTargets.length > 0
                          ? `${draggingClickTargets.length} target${
                              draggingClickTargets.length === 1 ? "" : "s"
                            }`
                          : "not assigned"}
                    </span>
                    {!isAssembly && (
                      <span className="mt-0.5 block truncate text-[10px] text-contrast-grayout">
                        Actions: {draggingAnimatedEntries.length || 0} · {draggingAnimationMode}
                      </span>
                    )}
                  </span>
                  <StatusBadge ready={draggingReady}>
                    {draggingReady ? "Ready" : "Setup"}
                  </StatusBadge>
                </div>

                <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-divider-main pl-2">
                  <span className="grid size-7 place-items-center rounded-md bg-white/5 text-secondary-default">
                    <MaterialIcon name="drag_indicator" size={20} />
                  </span>
                  <span className="grid size-7 place-items-center rounded-md text-red-300/70">
                    <MaterialIcon name="delete" size={20} />
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Section>
  );
}
