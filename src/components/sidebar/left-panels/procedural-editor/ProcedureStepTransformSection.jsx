import { useEffect, useState } from "react";
import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";
import SelectField from "../../../ui/select";

export default function ProcedureStepTransformSection({
  procedural,
  step,
  isAssembly,
}) {
  const [rotationExpanded, setRotationExpanded] = useState(false);
  const activeEntry = procedural.activeAnimatedEntry || null;

  useEffect(() => {
    procedural?.setTransformMode?.("translate");
  }, [procedural, step?.id]);

  return (
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="mb-3">
        <p className="text-xs font-normal text-white">
          {isAssembly ? "Set Start & Target" : "Set Start & End"}
        </p>
      </div>

      {!isAssembly && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-main/35 bg-accent-main/10 px-2.5 py-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
              Active animation action
            </span>
            <span className="block truncate text-xs font-normal text-white">
              {activeEntry?.object?.name || "Select an animation action above"}
            </span>
          </span>
        </div>
      )}

      {isAssembly && activeEntry?.object && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-main/35 bg-accent-main/10 px-2.5 py-2">
          <MaterialIcon
            name="precision_manufacturing"
            size={20}
            className="text-secondary-default"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-normal text-white">
            {activeEntry.object.name || "Assembly object"}
          </span>
        </div>
      )}

      {!isAssembly && (
        <div className="mb-3 overflow-hidden rounded-lg border border-secondary-default/40 bg-black/10">
          <button
            type="button"
            onClick={() => setRotationExpanded((current) => !current)}
            className="cursor-pointer flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/5"
            aria-expanded={rotationExpanded}
          >
            <span className="flex items-center gap-2 text-xs font-normal text-white">
              <MaterialIcon
                name="360"
                size={20}
                className="text-secondary-default"
              />
              Rotation Animation
            </span>
            <MaterialIcon
              name="expand_more"
              size={20}
              className={[
                "text-secondary-default transition-transform",
                rotationExpanded ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {rotationExpanded && (
            <div className="space-y-3 border-t border-secondary-default/30 p-3">
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
                <SelectField value={step.action?.spinAxis || "z"}
                  onChange={(value) =>
                    procedural.updateStep(step.id, {
                      action: { spinAxis: value },
                    })
                  }
                  options={[
                    { label: "Local X", value: "x" },
                    { label: "Local Y", value: "y" },
                    { label: "Local Z", value: "z" },
                  ]}
                  className="h-9!"
                />
              </label>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          disabled={!activeEntry}
          onClick={procedural.captureStartTransform}
        >
          <MaterialIcon name="flag" size={20} />
          Update Start
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={!activeEntry}
          onClick={procedural.captureEndTransform}
        >
          <MaterialIcon name="sports_score" size={20}  />
          {isAssembly ? "Update Target" : "Update End"}
        </Button>
      </div>

      {isAssembly && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="xs"
            disabled={!activeEntry?.startTransform}
            onClick={procedural.showActiveStepStart}
          >
            <MaterialIcon name="first_page" size={20}  />
            Show Start
          </Button>
          <Button
            type="button"
            size="xs"
            disabled={!activeEntry?.endTransform}
            onClick={procedural.showActiveStepTarget}
          >
            <MaterialIcon name="my_location" size={20}  />
            Show Target
          </Button>
        </div>
      )}
    </section>
  );
}
