export default function ProcedureStepInteractionSettings({
  procedural,
  step,
  isAssembly,
}) {
  if (isAssembly) {
    return (
      <div className="space-y-3 rounded-lg border border-secondary-default/50 bg-primary/40 p-3">
        <div className="grid grid-cols-2 gap-3">
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
          </label>
          <div className="block">
            <span className="mb-1.5 block text-xs text-contrast-grayout">
              Target Rotation
            </span>
            <div className="flex h-10 items-center rounded-lg border border-secondary-default/60 bg-primary px-3 text-xs text-secondary-default">
              Auto align when snapped
            </div>
          </div>
        </div>

        {[
          ["autoSnap", "Auto snap when correct"],
          ["snapBackOnFail", "Return to start when incorrect"],
          ["showGhost", "Show transparent target ghost"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 text-xs text-white"
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
