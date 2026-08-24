import MaterialIcon from "../../../ui/material-icon";

export default function ProcedureStepInteractionSettings({
  procedural,
  step,
  isAssembly,
}) {
  if (isAssembly) {
    return (
      <details className="group rounded-xl border border-secondary-default/40 bg-primary/35">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-white">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent-main/10 text-secondary-default">
              <MaterialIcon name="settings" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold">Advanced Assembly Settings</span>
              <span className="block text-[9px] font-normal text-contrast-grayout">
                Default values are ready to use
              </span>
            </span>
          </span>
          <MaterialIcon name="expand_more" className="size-4 shrink-0 text-contrast-grayout" />
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
              className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
            />
            <span className="mt-1 block text-[9px] leading-4 text-contrast-grayout">
              How close the object must be to the authored Target before the placement is accepted.
            </span>
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
              <input
                type="checkbox"
                checked={step.interaction?.[key] !== false}
                onChange={(event) =>
                  procedural.updateStep(step.id, {
                    interaction: { [key]: event.target.checked },
                  })
                }
                className="size-4 accent-cyan-400"
              />
            </label>
          ))}
        </div>
      </details>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Duration (ms)
          </span>
          <input
            type="number"
            min="100"
            max="30000"
            step="100"
            value={step.action?.duration || 1200}
            onChange={(event) =>
              procedural.updateStep(step.id, {
                action: { duration: Number(event.target.value) },
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Extra Spin
          </span>
          <input
            type="number"
            min="-20"
            max="20"
            step="0.25"
            value={step.action?.spinTurns || 0}
            onChange={(event) =>
              procedural.updateStep(step.id, {
                action: { spinTurns: Number(event.target.value) },
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs text-contrast-grayout">
          Spin Axis
        </span>
        <select
          value={step.action?.spinAxis || "z"}
          onChange={(event) =>
            procedural.updateStep(step.id, {
              action: { spinAxis: event.target.value },
            })
          }
          className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
        >
          <option value="x">Local X</option>
          <option value="y">Local Y</option>
          <option value="z">Local Z</option>
        </select>
      </label>
    </>
  );
}
