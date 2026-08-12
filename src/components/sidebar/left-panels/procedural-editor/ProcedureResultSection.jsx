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
              Every click target assigned to the active step is highlighted.
              Clicking any one of them satisfies the step condition.
            </p>
            <p>
              Animated objects follow the Together or Sequential playback mode
              saved on each step.
            </p>
            <p>
              Objects with Hide after animation enabled disappear after their
              own movement finishes.
            </p>
            <p>
              After the animation finishes, the next step&apos;s click targets become active.
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
