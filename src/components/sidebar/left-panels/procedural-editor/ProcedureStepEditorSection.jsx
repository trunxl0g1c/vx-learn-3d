import { useEffect, useRef } from "react";
import MaterialIcon from "../../../ui/material-icon";
import ProcedureStepObjectSection from "./ProcedureStepObjectSection";
import ProcedureStepTransformSection from "./ProcedureStepTransformSection";
import ProcedureStepViewStateSection from "./ProcedureStepViewStateSection";
import ProcedureStepInteractionSettings from "./ProcedureStepInteractionSettings";
import ProcedureStepActions from "./ProcedureStepActions";

export default function ProcedureStepEditorSection({
  procedural,
  step,
  stepReady,
  isAssembly,
  scrollResetKey = 0,
  onClose,
}) {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [scrollResetKey, step?.id]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-secondary-default/60 bg-[#151b1b]/95 shadow-2xl backdrop-blur-xl">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-divider-main bg-[#14201f] px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {isAssembly ? "Configure Assembly Step" : "Configure Step"}
          </p>
          <p className="truncate text-[10px] text-contrast-grayout">{step.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10 hover:text-white"
          title="Close Configure Step"
          aria-label="Close Configure Step"
        >
          <MaterialIcon name="close" className="size-5" />
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Step Name
          </span>
          <input
            value={step.name}
            onChange={(event) =>
              procedural.updateStep(step.id, { name: event.target.value })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Instruction in Player
          </span>
          <textarea
            value={step.instruction}
            onChange={(event) =>
              procedural.updateStep(step.id, {
                instruction: event.target.value,
              })
            }
            rows={2}
            className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none"
          />
        </label>

        <ProcedureStepObjectSection
          procedural={procedural}
          step={step}
          isAssembly={isAssembly}
        />
        <ProcedureStepTransformSection
          procedural={procedural}
          step={step}
          isAssembly={isAssembly}
        />
        <ProcedureStepViewStateSection
          procedural={procedural}
          step={step}
          isAssembly={isAssembly}
        />
        <ProcedureStepInteractionSettings
          procedural={procedural}
          step={step}
          isAssembly={isAssembly}
        />
        <ProcedureStepActions
          procedural={procedural}
          step={step}
          stepReady={stepReady}
          isAssembly={isAssembly}
        />
      </div>
    </div>
  );
}
