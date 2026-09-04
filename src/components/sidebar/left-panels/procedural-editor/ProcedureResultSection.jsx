import { useState } from "react";
import MaterialIcon from "../../../ui/material-icon";
import ConfirmationDialog from "../../../dialog/ConfirmationDialog";
import { Section } from "./PanelPrimitives";
import AuthoringInfoNote from "./AuthoringInfoNote";

export default function ProcedureResultSection({
  procedural,
  procedure,
  isAssembly,
}) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const resultInfo = isAssembly
    ? "Assembly steps run sequentially in Player. The active component is highlighted and can be dragged. A transparent ghost shows the correct installation target. Each step restores the saved authoring POV and locks the camera. Correct placement snaps into position and unlocks the next step."
    : "Steps run sequentially in Player. Every click target assigned to the active step is highlighted. Animation actions follow the Together or Sequential playback mode saved on each step. Objects with Hide after this action enabled disappear when that action finishes. After the animation finishes, the next step's click targets become active.";

  return (
    <Section title="Player Result" step="5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-secondary-default/35 bg-primary/35 px-3 py-2.5">
        <span className="text-xs text-contrast-grayout">Player behavior</span>
        <AuthoringInfoNote text={resultInfo} />
      </div>

      <button
        type="button"
        onClick={() => setConfirmDeleteOpen(true)}
        className="mt-4 flex items-center gap-2 text-xs text-red-300 hover:text-red-200"
      >
        <MaterialIcon name="delete_forever" className="size-5" />
        Delete Procedure Material
      </button>

      <ConfirmationDialog
        open={confirmDeleteOpen}
        title="Delete Procedure?"
        message={`Delete "${procedure.name || "this procedure"}"?`}
        description="All of its steps and settings will be removed. This action cannot be undone."
        confirmText="Delete Procedure"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          procedural.deleteProcedure(procedure.id);
          setConfirmDeleteOpen(false);
        }}
      />
    </Section>
  );
}
