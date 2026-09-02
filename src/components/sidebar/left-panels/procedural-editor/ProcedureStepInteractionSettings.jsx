import Checkbox from "../../../ui/checkbox";
import MaterialIcon from "../../../ui/material-icon";

export default function ProcedureStepInteractionSettings({
  procedural,
  step,
  isAssembly,
}) {
  if (!isAssembly) return null;

  return (
    <details className="group rounded-xl border border-secondary-default/40 bg-primary/35">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-white">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent-main/10 text-secondary-default">
            <MaterialIcon name="settings" size={20} />
          </span>
          <span className="text-xs font-normal">Advanced Assembly Settings</span>
        </span>
        <MaterialIcon name="expand_more" size={20} className="shrink-0 text-contrast-grayout" />
      </summary>

      <div className="space-y-3 border-t border-secondary-default/30 p-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Snap Distance (% model)
          </span>
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.5"
            value={Number(
              (step.interaction?.snapDistance || 0.05) * 100,
            ).toFixed(1)}
            onChange={(event) =>
              procedural.updateStep(step.id, {
                interaction: {
                  snapDistance: Number(event.target.value) / 100,
                },
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>

        {[
          ["autoSnap", "Auto snap when correct"],
          ["snapBackOnFail", "Return to start when incorrect"],
          ["showGhost", "Show transparent target ghost"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 rounded-lg border border-secondary-default/25 bg-black/10 px-2.5 py-2 text-xs text-white"
          >
            <span>{label}</span>
            <Checkbox
              checked={step.interaction?.[key] || false}
              disabled={step.interaction?.[key] === undefined}
              onCheckedChange={(checked) =>
                procedural.updateStep(step.id, {
                  interaction: { [key]: checked },
                })
              }
            />
          </label>
        ))}
      </div>
    </details>
  );
}
