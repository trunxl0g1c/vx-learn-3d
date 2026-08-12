import { Section } from "./PanelPrimitives";
import ProcedureStepObjectSection from "./ProcedureStepObjectSection";
import ProcedureStepTransformSection from "./ProcedureStepTransformSection";
import ProcedureStepViewStateSection from "./ProcedureStepViewStateSection";
import ProcedureStepInteractionSettings from "./ProcedureStepInteractionSettings";
import ProcedureStepActions from "./ProcedureStepActions";

export default function ProcedureStepEditorSection({
  procedural,
  procedure,
  step,
  stepIndex,
  stepReady,
  isAssembly,
}) {
  return (
    <Section title={`Configure Step ${stepIndex + 1}`} step="4">
      <div className="space-y-4">
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
          procedure={procedure}
          step={step}
          stepIndex={stepIndex}
          stepReady={stepReady}
          isAssembly={isAssembly}
        />
      </div>
    </Section>
  );
}
