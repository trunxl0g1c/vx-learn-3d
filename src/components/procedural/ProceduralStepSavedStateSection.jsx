import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

function SavedStateBadge({ saved }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-[10px]",
        saved
          ? "border-green-400/40 bg-green-500/10 text-green-200"
          : "border-warning-main/40 bg-warning-main/10 text-warning-main",
      ].join(" ")}
    >
      {saved ? "Saved" : "Optional"}
    </span>
  );
}

export default function ProceduralStepSavedStateSection({
  procedural,
  step,
}) {
  const hasVisualState = Boolean(step?.visualState);

  return (
    <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">Visual State</p>
          <p className="mt-1 text-[10px] leading-4 text-contrast-grayout">
            Saves highlight, X-Ray, visibility, pull-apart, and Cut state for
            this step.
          </p>
        </div>
        <SavedStateBadge saved={hasVisualState} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant={hasVisualState ? "default" : "cyanOutline"}
          onClick={procedural?.saveActiveStepVisualState}
        >
          <MaterialIcon name="layers" className="size-4" />
          {hasVisualState ? "Update State" : "Save State"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!hasVisualState}
          onClick={procedural?.showActiveStepVisualState}
        >
          <MaterialIcon name="visibility" className="size-4" />
          View State
        </Button>
      </div>

      {hasVisualState && (
        <button
          type="button"
          onClick={procedural?.deleteActiveStepVisualState}
          className="text-[10px] text-red-300 hover:text-red-200"
        >
          Remove saved state
        </button>
      )}
    </div>
  );
}
