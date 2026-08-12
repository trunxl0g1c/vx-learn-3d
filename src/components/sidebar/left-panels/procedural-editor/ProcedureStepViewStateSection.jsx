import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import { StatusBadge } from "./PanelPrimitives";

export default function ProcedureStepViewStateSection({
  procedural,
  step,
  isAssembly,
}) {
  const hasVisualState = Boolean(step?.visualState);
  const hasCameraView = Boolean(step?.cameraView);
  const hasAnySavedView = hasVisualState || hasCameraView;
  const hasCompleteSavedView = hasVisualState && hasCameraView;

  const statusLabel = hasCompleteSavedView
    ? "Saved"
    : hasAnySavedView
      ? "Incomplete"
      : isAssembly
        ? "Required"
        : "Optional";

  return (
    <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">
            Camera &amp; Visual State
          </p>
          <p className="mt-1 text-[10px] leading-4 text-contrast-grayout">
            Saves the current camera together with highlight, X-Ray,
            visibility, pull-apart, and Cut state for this step.
          </p>
        </div>
        <StatusBadge ready={hasCompleteSavedView}>{statusLabel}</StatusBadge>
      </div>

      <div className="space-y-2">
        <Button
          type="button"
          size="xs"
          className="w-full"
          variant={hasCompleteSavedView ? "default" : "cyanOutline"}
          onClick={procedural?.saveActiveStepViewState}
        >
          <MaterialIcon name="save" className="size-4" />
          {hasCompleteSavedView
            ? "Update Camera + State"
            : "Save Camera + State"}
        </Button>
        <Button
          type="button"
          size="xs"
          className="w-full"
          variant="darkOutline"
          disabled={!hasAnySavedView}
          onClick={procedural?.showActiveStepViewState}
        >
          <MaterialIcon name="visibility" className="size-4" />
          View Saved
        </Button>
      </div>

      {hasAnySavedView && (
        <button
          type="button"
          onClick={procedural?.deleteActiveStepViewState}
          className="text-[10px] text-red-300 transition hover:text-red-200"
        >
          Remove saved camera and state
        </button>
      )}
    </div>
  );
}
