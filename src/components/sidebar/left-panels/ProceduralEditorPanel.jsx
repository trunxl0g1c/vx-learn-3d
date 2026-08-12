import { useMemo, useState } from "react";
import MaterialIcon from "../../ui/material-icon";
import ProcedureSelectionSection from "./procedural-editor/ProcedureSelectionSection";
import ProcedureInfoSection from "./procedural-editor/ProcedureInfoSection";
import ProcedureStepListSection from "./procedural-editor/ProcedureStepListSection";
import ProcedureStepEditorSection from "./procedural-editor/ProcedureStepEditorSection";
import ProcedureResultSection from "./procedural-editor/ProcedureResultSection";
import { getUniqueAnimationOptions } from "./procedural-editor/utils";

export default function ProceduralEditorPanel({
  procedural,
  selectedObjectName,
  animations = [],
  authoredAnimations = [],
  onBack,
}) {
  const [newProcedureType, setNewProcedureType] = useState("assembly");
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
  const stepIndex =
    procedure?.steps?.findIndex((item) => item.id === step?.id) ?? -1;
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

  return (
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
        <div>
          <p className="text-base font-semibold text-white">
            Procedure Authoring
          </p>
          <p className="text-[11px] text-contrast-grayout">
            Build guided and assembly training
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
              animationOptions={animationOptions}
            />
            <ProcedureStepListSection
              procedural={procedural}
              procedure={procedure}
              isAssembly={isAssembly}
            />
            {step && (
              <ProcedureStepEditorSection
                procedural={procedural}
                procedure={procedure}
                step={step}
                stepIndex={stepIndex}
                stepReady={stepReady}
                isAssembly={isAssembly}
              />
            )}
            <ProcedureResultSection
              procedural={procedural}
              procedure={procedure}
              isAssembly={isAssembly}
            />
          </>
        )}
      </div>
    </div>
  );
}
