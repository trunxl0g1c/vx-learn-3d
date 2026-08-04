import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

export default function ProcedureStepActions({
  procedural,
  procedure,
  step,
  stepIndex,
  stepReady,
  isAssembly,
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant="cyanOutline"
          disabled={!stepReady || procedural.isPreviewing}
          onClick={procedural.previewActiveStep}
        >
          <MaterialIcon name="play_arrow" className="size-4" />
          {procedural.isPreviewing
            ? "Playing..."
            : isAssembly
              ? "Preview Install"
              : "Preview Step"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!step.startTransform}
          onClick={procedural.resetActiveStep}
        >
          <MaterialIcon name="restart_alt" className="size-4" />
          Reset Step
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-divider-main pt-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={stepIndex <= 0}
            onClick={() => procedural.moveStep(step.id, -1)}
            className="grid size-8 place-items-center rounded-lg border border-secondary-default/50 text-secondary-default disabled:opacity-30"
            title="Move step up"
          >
            <MaterialIcon name="arrow_upward" className="size-4" />
          </button>
          <button
            type="button"
            disabled={stepIndex >= procedure.steps.length - 1}
            onClick={() => procedural.moveStep(step.id, 1)}
            className="grid size-8 place-items-center rounded-lg border border-secondary-default/50 text-secondary-default disabled:opacity-30"
            title="Move step down"
          >
            <MaterialIcon name="arrow_downward" className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => procedural.deleteStep(step.id)}
          className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200"
        >
          <MaterialIcon name="delete" className="size-4" />
          Delete Step
        </button>
      </div>
    </>
  );
}
