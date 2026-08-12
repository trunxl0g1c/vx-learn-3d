import MaterialIcon from "../../../ui/material-icon";
import { Section } from "./PanelPrimitives";

const DEFAULT_COMPLETION_ANIMATION = {
  name: "",
  source: "embedded",
  animationId: "",
  autoPlay: true,
  loop: false,
  speed: 1,
};

function updateCompletionAnimation(procedural, procedure, current, patch) {
  procedural.updateProcedure(procedure.id, {
    settings: {
      completionAnimation: {
        ...current,
        ...patch,
      },
    },
  });
}

function getCompletionAnimationValue(animation) {
  if (animation?.source === "authored" && animation?.animationId) {
    return `authored::${animation.animationId}`;
  }
  return animation?.name ? `embedded::${animation.name}` : "";
}

export default function ProcedureInfoSection({
  procedural,
  procedure,
  animationOptions,
}) {
  const completionAnimation =
    procedure?.settings?.completionAnimation || DEFAULT_COMPLETION_ANIMATION;

  return (
    <Section title="Procedure Information" step="2">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Procedure Name
          </span>
          <input
            value={procedure.name}
            onChange={(event) =>
              procedural.updateProcedure(procedure.id, {
                name: event.target.value,
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Procedure Type
          </span>
          <select
            value={procedure.type || "guided"}
            onChange={(event) =>
              procedural.updateProcedure(procedure.id, {
                type: event.target.value,
              })
            }
            className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
          >
            <option value="assembly">Assembly</option>
            <option value="guided">Guided Procedure</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs text-contrast-grayout">
            Description
          </span>
          <textarea
            value={procedure.description}
            onChange={(event) =>
              procedural.updateProcedure(procedure.id, {
                description: event.target.value,
              })
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none"
            placeholder="Example: Remove all bolts, then open the engine cover."
          />
        </label>

        <div className="rounded-lg border border-secondary-default/50 bg-primary/50 p-3">
          <div className="flex items-center gap-2">
            <MaterialIcon
              name="animation"
              className="size-5 text-secondary-default"
            />
            <div>
              <p className="text-xs font-semibold text-white">
                Animation After Completion
              </p>
              <p className="mt-0.5 text-[10px] text-contrast-grayout">
                Start an embedded or authored animation after the last procedure step.
              </p>
            </div>
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-[11px] text-contrast-grayout">
              Project Animation
            </span>
            <select
              value={getCompletionAnimationValue(completionAnimation)}
              onChange={(event) => {
                const selected = animationOptions.find(
                  (animation) => animation.value === event.target.value,
                );
                updateCompletionAnimation(
                  procedural,
                  procedure,
                  completionAnimation,
                  selected
                    ? {
                        name: selected.name,
                        source: selected.source,
                        animationId: selected.animationId,
                      }
                    : { name: "", source: "embedded", animationId: "" },
                );
              }}
              className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none"
            >
              <option value="">No completion animation</option>
              {animationOptions.map((animation) => (
                <option key={animation.value} value={animation.value}>
                  {animation.label || animation.name}
                </option>
              ))}
            </select>
          </label>

          {completionAnimation.name && (
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between gap-3 text-xs text-white">
                <span>Auto Play after completion</span>
                <input
                  type="checkbox"
                  checked={completionAnimation.autoPlay !== false}
                  onChange={(event) =>
                    updateCompletionAnimation(
                      procedural,
                      procedure,
                      completionAnimation,
                      { autoPlay: event.target.checked },
                    )
                  }
                  className="size-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-white">
                <span>Loop animation</span>
                <input
                  type="checkbox"
                  checked={completionAnimation.loop === true}
                  onChange={(event) =>
                    updateCompletionAnimation(
                      procedural,
                      procedure,
                      completionAnimation,
                      { loop: event.target.checked },
                    )
                  }
                  className="size-4 accent-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                  Speed
                </span>
                <select
                  value={String(completionAnimation.speed || 1)}
                  onChange={(event) =>
                    updateCompletionAnimation(
                      procedural,
                      procedure,
                      completionAnimation,
                      { speed: Number(event.target.value) || 1 },
                    )
                  }
                  className="h-9 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-xs text-white outline-none"
                >
                  {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {animationOptions.length === 0 && (
            <p className="mt-3 text-[10px] text-warning-main">
              No embedded or authored animation is available yet.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}
