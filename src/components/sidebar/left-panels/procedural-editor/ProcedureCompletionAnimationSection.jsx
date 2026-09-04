import Checkbox from "../../../ui/checkbox";
import MaterialIcon from "../../../ui/material-icon";
import SelectField from "../../../ui/select";
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
          <MaterialIcon
            name="animation"
            size={20}
            className="text-accent-main"
          />
          <p className="text-xs font-normal text-white">Completion Animation</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] text-contrast-grayout">
            Project Animation
          </span>
          <SelectField
            value={getCompletionAnimationValue(completionAnimation)}
            onChange={(value) => {
              const selected = animationOptions.find(
                (animation) => animation.value === value,
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
            className="w-full h-9!"
            placeholder="No completion animation"
            options={animationOptions.map((animation) => ({
              value: animation.value,
              label: animation.label || animation.name,
            }))}
          />
        </label>

        {completionAnimation.name && (
          <div className="space-y-3 rounded-lg border border-secondary-default/35 bg-black/10 p-3">
            <label className="flex items-center justify-between gap-3 text-xs text-white">
              <span>Auto Play after completion</span>
              <Checkbox
                checked={completionAnimation.autoPlay === true}
                onCheckedChange={(checked) =>
                  updateCompletionAnimation(
                    procedural,
                    procedure,
                    completionAnimation,
                    { autoPlay: checked },
                  )
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-xs text-white">
              <span>Loop animation</span>
              <Checkbox
                checked={completionAnimation.loop === true}
                onCheckedChange={(checked) =>
                  updateCompletionAnimation(
                    procedural,
                    procedure,
                    completionAnimation,
                    { loop: checked },
                  )
                }
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                Speed
              </span>
              <SelectField
                value={String(completionAnimation.speed || 1)}
                onChange={(value) =>
                  updateCompletionAnimation(
                    procedural,
                    procedure,
                    completionAnimation,
                    { speed: Number(value) || 1 },
                  )
                }
                className="w-full h-9!"
                options={[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => ({
                  value: String(speed),
                  label: `${speed}x`,
                }))}
              />
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
