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

export default function ProcedureCompletionAnimationSection({
  procedural,
  procedure,
  animationOptions = [],
}) {
  const completionAnimation =
    procedure?.settings?.completionAnimation || DEFAULT_COMPLETION_ANIMATION;

  return (
    <Section title="Animation After Completion">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-secondary-default/50 bg-primary/50 p-3">
          <MaterialIcon name="animation" className="size-5 text-secondary-default" />
          <p className="text-xs font-semibold text-white">Completion Animation</p>
        </div>

        <label className="block">
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
          <div className="space-y-3 rounded-lg border border-secondary-default/35 bg-black/10 p-3">
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
          <div className="flex items-center gap-2 rounded-lg border border-warning-main/35 bg-warning-main/5 px-3 py-2 text-[10px] text-warning-main">
            <MaterialIcon name="warning" className="size-4" />
            No embedded or authored animation is available yet.
          </div>
        )}
      </div>
    </Section>
  );
}
