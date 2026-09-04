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
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-xs font-normal text-white">
            {isAssembly ? "Save Step View" : "Camera & Visual State"}
          </p>
        </div>
        <StatusBadge ready={hasCompleteSavedView}>{statusLabel}</StatusBadge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant={hasCompleteSavedView ? "default" : "outline"}
          onClick={procedural?.saveActiveStepViewState}
        >
          <MaterialIcon name="save" size={20} />
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
          variant="outline"
          disabled={!hasAnySavedView}
          onClick={procedural?.showActiveStepViewState}
        >
          <MaterialIcon name="visibility" size={20} />
          View Saved
        </Button>
      </div>

      {hasAnySavedView && (
        <button
          type="button"
          onClick={procedural?.deleteActiveStepViewState}
          className="mt-2 text-xs text-red-300 transition hover:text-red-200"
        >
          Remove saved camera and state
        </button>
      )}
    </section>
  );
}
