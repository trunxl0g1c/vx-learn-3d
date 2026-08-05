import ProceduralAnimatedObjectList from "../../../procedural/ProceduralAnimatedObjectList";
import MiniLogicalObjectPicker from "./MiniLogicalObjectPicker";

export default function ProcedureStepObjectSection({
  procedural,
  step,
  isAssembly,
}) {
  return (
    <div className="space-y-3">
      {isAssembly ? (
        <MiniLogicalObjectPicker
          key={`${step.id}-assembly-object`}
          procedural={procedural}
          role="animated"
          title="Assembly Object"
          icon="precision_manufacturing"
          assignedReference={step.animatedObject || step.targetObject}
        />
      ) : (
        <>
          <MiniLogicalObjectPicker
            key={`${step.id}-click-target`}
            procedural={procedural}
            role="target"
            title="Click Target"
            icon="ads_click"
            assignedReference={step.targetObject}
          />

          <MiniLogicalObjectPicker
            key={`${step.id}-animated-object`}
            procedural={procedural}
            role="animated"
            title="Add Animated Object"
            icon="animation"
            assignedReference={procedural.activeAnimatedEntry?.object}
          />

          <ProceduralAnimatedObjectList
            entries={procedural.activeAnimatedEntries}
            activeEntryId={procedural.activeAnimatedEntryId}
            onSelect={procedural.selectAnimatedEntry}
            onRemove={procedural.removeAnimatedEntry}
          />
        </>
      )}

      <p className="text-[10px] leading-4 text-contrast-grayout">
        {isAssembly
          ? "Select the component that the learner must drag. Save its loose start position, then move it with the gizmo and save the installed target position."
          : "Choose one click target, then add one or more animated objects. Clicking the target in Player moves every assigned object together."}
      </p>
    </div>
  );
}
