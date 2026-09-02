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
        variant="outline"
        disabled={!step.startTransform}
        onClick={procedural.resetActiveStep}
      >
        <MaterialIcon name="restart_alt" size={20} />
        Reset Step
      </Button>
      <Button
        type="button"
        size="xs"
        variant={procedural.isPreviewing ? "outline" : "default"}
        disabled={!stepReady || procedural.isPreviewing}
        onClick={procedural.previewActiveStep}
      >
        <MaterialIcon name="play_arrow" size={20} />
        {procedural.isPreviewing
          ? "Playing..."
          : isAssembly
            ? "Preview Install"
            : "Preview Step"}
      </Button>
    </div>
  );
}
