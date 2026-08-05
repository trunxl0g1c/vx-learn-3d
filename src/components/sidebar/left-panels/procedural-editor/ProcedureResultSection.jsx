import MaterialIcon from "../../../ui/material-icon";
import { Section } from "./PanelPrimitives";

export default function ProcedureResultSection({
  procedural,
  procedure,
  isAssembly,
}) {
  return (
    <Section title="Player Result" step="5">
      <div className="space-y-2 text-xs leading-5 text-contrast-grayout">
        {isAssembly ? (
          <>
            <p>Assembly steps run sequentially in Player.</p>
            <p>The active component is highlighted and can be dragged.</p>
            <p>A transparent ghost shows the correct installation target.</p>
            <p>Each step restores the saved authoring POV and locks the camera.</p>
            <p>Correct placement snaps into position and unlocks the next step.</p>
          </>
        ) : (
          <>
            <p>Steps run sequentially in Player.</p>
            <p>
              The current click target is highlighted and only that object is
              accepted.
            </p>
            <p>The configured animated object then moves, rotates, and scales.</p>
            <p>
              After the animation finishes, the next click target becomes active.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => procedural.deleteProcedure(procedure.id)}
        className="mt-4 flex items-center gap-2 text-xs text-red-300 hover:text-red-200"
      >
        <MaterialIcon name="delete_forever" className="size-5" />
        Delete Procedure Material
      </button>
    </Section>
  );
}
