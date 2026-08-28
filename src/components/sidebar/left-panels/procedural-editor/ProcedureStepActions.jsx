import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

export default function ProcedureStepActions({
  procedural,
  step,
  stepReady,
  isAssembly,
}) {
  return (
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
  );
}
