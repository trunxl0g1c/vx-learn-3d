import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

const TRANSFORM_MODES = [
  ["translate", "Move", "open_with"],
  ["rotate", "Rotate", "360"],
  ["scale", "Scale", "zoom_out_map"],
];

export default function ProcedureStepTransformSection({
  procedural,
  step,
  isAssembly,
}) {
  return (
    <>
      <div>
        <span className="mb-1.5 block text-xs text-contrast-grayout">
          Gizmo Mode
        </span>
        <div className="grid grid-cols-3 gap-2">
          {TRANSFORM_MODES.map(([mode, label, icon]) => (
            <Button
              key={mode}
              type="button"
              size="xs"
              variant={
                procedural.transformMode === mode ? "default" : "darkOutline"
              }
              onClick={() => procedural.setTransformMode(mode)}
            >
              <MaterialIcon name={icon} className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!procedural.activeAnimatedEntry}
          onClick={procedural.captureStartTransform}
        >
          <MaterialIcon name="flag" className="size-4" />
          Save Start
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!procedural.activeAnimatedEntry}
          onClick={procedural.captureEndTransform}
        >
          <MaterialIcon name="sports_score" className="size-4" />
          {isAssembly ? "Save Target" : "Save End"}
        </Button>
      </div>

      <div className="rounded-lg border border-secondary-default/50 bg-primary/40 p-3 text-[10px] leading-5 text-contrast-grayout">
        {isAssembly
          ? "Workflow: place the component in its loose/start position and save Start. Move/rotate it into the correct installed position and save Target. Use Show Start and Show Target to verify both states."
          : "Workflow: add one or more click targets, add every object that should move, select each animated object in the list, then save its Start and End transforms. Playback follows the Together or Sequential mode selected above."}
      </div>

      {isAssembly && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!step.startTransform}
            onClick={procedural.showActiveStepStart}
          >
            <MaterialIcon name="first_page" className="size-4" />
            Show Start
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!step.endTransform}
            onClick={procedural.showActiveStepTarget}
          >
            <MaterialIcon name="my_location" className="size-4" />
            Show Target
          </Button>
        </div>
      )}

    </>
  );
}
