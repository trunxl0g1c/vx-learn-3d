import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { StatusBadge } from "./PanelPrimitives";

export default function ProcedureStepCameraSection({
  procedural,
  step,
  isAssembly,
}) {
  return (
    <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">Camera POV</p>
          <p className="mt-1 text-[10px] leading-4 text-contrast-grayout">
            Player applies this authoring view when the step starts. Assembly
            steps also lock it during drag.
          </p>
        </div>
        <StatusBadge ready={Boolean(step.cameraView)}>
          {step.cameraView
            ? "Saved"
            : isAssembly
              ? "Required"
              : "Optional"}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant={step.cameraView ? "default" : "cyanOutline"}
          onClick={procedural.captureStepCameraView}
        >
          <MaterialIcon name="photo_camera" className="size-4" />
          {step.cameraView ? "Update Camera" : "Save Camera"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!step.cameraView}
          onClick={procedural.showActiveStepCameraView}
        >
          <MaterialIcon name="center_focus_strong" className="size-4" />
          View Camera
        </Button>
      </div>

      {step.cameraView && (
        <button
          type="button"
          onClick={procedural.deleteActiveStepCameraView}
          className="text-[10px] text-red-300 hover:text-red-200"
        >
          Remove saved camera
        </button>
      )}
    </div>
  );
}
