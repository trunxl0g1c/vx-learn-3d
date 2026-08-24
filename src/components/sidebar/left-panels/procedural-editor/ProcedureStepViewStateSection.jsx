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
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isAssembly && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[9px] font-bold text-secondary-default">
                3
              </span>
            )}
            <p className="text-xs font-semibold text-white">
              {isAssembly ? "Save Step View" : "Camera & Visual State"}
            </p>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-contrast-grayout">
            {isAssembly
              ? "Save the camera and current visual state together. Player restores this view while the learner installs the component."
              : "Saves the current camera together with highlight, X-Ray, visibility, pull-apart, and Cut state for this step."}
          </p>
        </div>
        <StatusBadge ready={hasCompleteSavedView}>{statusLabel}</StatusBadge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant={hasCompleteSavedView ? "default" : "cyanOutline"}
          onClick={procedural?.saveActiveStepViewState}
        >
          <MaterialIcon name="save" className="size-4" />
          {isAssembly
            ? hasCompleteSavedView
              ? "Update View"
              : "Save Step View"
            : hasCompleteSavedView
              ? "Update Camera + State"
              : "Save Camera + State"}
        </Button>
        <Button
          type="button"
          size="xs"
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
          className="mt-2 text-[10px] text-red-300 transition hover:text-red-200"
        >
          Remove saved camera and state
        </button>
      )}
    </section>
  );
}
