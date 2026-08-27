import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "../../ui/material-icon";
import ProcedureSelectionSection from "./procedural-editor/ProcedureSelectionSection";
import ProcedureInfoSection from "./procedural-editor/ProcedureInfoSection";
import ProcedureStepListSection from "./procedural-editor/ProcedureStepListSection";
import ProcedureStepEditorSection from "./procedural-editor/ProcedureStepEditorSection";
import ProcedureCompletionAnimationSection from "./procedural-editor/ProcedureCompletionAnimationSection";
import { getUniqueAnimationOptions } from "./procedural-editor/utils";

export default function ProceduralEditorPanel({
  procedural,
  selectedObjectName,
  animations = [],
  authoredAnimations = [],
  onBack,
  onStepPanelVisibilityChange,
}) {
  const [newProcedureType, setNewProcedureType] = useState("assembly");
  const [stepPanelOpen, setStepPanelOpen] = useState(false);
  const [stepPanelScrollResetKey, setStepPanelScrollResetKey] = useState(0);
  const procedure = procedural?.activeProcedure;
  const step = procedural?.activeStep;
  const animationOptions = useMemo(() => {
    const embedded = getUniqueAnimationOptions(animations).map((animation) => ({
      ...animation,
      source: "embedded",
      animationId: "",
      value: `embedded::${animation.name}`,
      label: `GLB · ${animation.name}`,
    }));
    const authored = (authoredAnimations || [])
      .filter((animation) => animation?.id && animation?.name)
      .map((animation) => ({
        name: animation.name,
        duration: Number(animation.duration) || 0,
        source: "authored",
        animationId: animation.id,
        value: `authored::${animation.id}`,
        label: `Authored · ${animation.name}`,
      }));

    return [...embedded, ...authored];
  }, [animations, authoredAnimations]);
  const isAssembly = procedure?.type === "assembly";
  const clickTargets = procedural?.activeClickTargets || [];
  const animatedEntries = procedural?.activeAnimatedEntries || [];
  const animatedEntriesReady =
    animatedEntries.length > 0 &&
    animatedEntries.every(
      (entry) => entry.startTransform && entry.endTransform,
    );
  const stepReady = Boolean(
    clickTargets.length > 0 &&
      animatedEntriesReady &&
      (!isAssembly || step?.cameraView),
  );

  useEffect(() => {
    if (step?.id) setStepPanelOpen(true);
    else setStepPanelOpen(false);
  }, [step?.id]);

  useEffect(() => {
    onStepPanelVisibilityChange?.(Boolean(step?.id && stepPanelOpen));
  }, [onStepPanelVisibilityChange, step?.id, stepPanelOpen]);

  useEffect(
    () => () => {
      onStepPanelVisibilityChange?.(false);
    },
    [onStepPanelVisibilityChange],
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-visible">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-2 bg-[#14201f] px-3 pr-14">
          <button
            type="button"
            onClick={() => {
              procedural?.stopAuthoring?.();
              onBack?.();
            }}
            className="grid size-9 place-items-center rounded-lg text-secondary-default hover:bg-white/10"
            title="Back to Pro Tools"
          >
            <MaterialIcon name="arrow_back" className="size-6" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-semibold text-white">
              Procedure Authoring
            </p>
          </div>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <ProcedureSelectionSection
            procedural={procedural}
            newProcedureType={newProcedureType}
            setNewProcedureType={setNewProcedureType}
          />

          {procedural?.isLoadingActiveProcedure && (
            <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-contrast-grayout">
              Loading Procedure details...
            </div>
          )}

          {procedure && !procedural?.isLoadingActiveProcedure && (
            <>
              <ProcedureInfoSection
                procedural={procedural}
                procedure={procedure}
              />
              <ProcedureStepListSection
                procedural={procedural}
                procedure={procedure}
                isAssembly={isAssembly}
                onOpenStep={() => {
                  setStepPanelOpen(true);
                  setStepPanelScrollResetKey((previousKey) => previousKey + 1);
                }}
              />
              <ProcedureCompletionAnimationSection
                procedural={procedural}
                procedure={procedure}
                animationOptions={animationOptions}
              />
            </>
          )}
        </div>
      </div>

      {procedure &&
        step &&
        stepPanelOpen &&
        !procedural?.isLoadingActiveProcedure &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-0 right-0 top-14 z-[180] w-[400px] overflow-hidden">
            <ProcedureStepEditorSection
              procedural={procedural}
              step={step}
              stepReady={stepReady}
              isAssembly={isAssembly}
              scrollResetKey={stepPanelScrollResetKey}
              onClose={() => setStepPanelOpen(false)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
