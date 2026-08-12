import ProceduralAnimatedObjectList from "../../../procedural/ProceduralAnimatedObjectList";
import ProceduralClickTargetList from "../../../procedural/ProceduralClickTargetList";
import MaterialIcon from "../../../ui/material-icon";
import MiniLogicalObjectPicker from "./MiniLogicalObjectPicker";
import { StatusBadge } from "./PanelPrimitives";

const ANIMATION_MODES = [
  {
    value: "together",
    label: "Together",
    icon: "animation",
    description: "All animated objects move at the same time.",
  },
  {
    value: "sequential",
    label: "Sequential",
    icon: "format_list_numbered",
    description: "Object 2 starts after object 1 finishes, and so on.",
  },
];

function AssignmentGroup({
  title,
  description,
  ready,
  count = 0,
  children,
}) {
  return (
    <section className="rounded-xl border border-secondary-default/60 bg-primary/50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">{title}</p>
          <p className="mt-1 text-[10px] leading-4 text-contrast-grayout">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span className="rounded-full border border-secondary-default/40 px-2 py-1 text-[9px] text-secondary-default">
              {count}
            </span>
          )}
          <StatusBadge ready={ready}>{ready ? "Assigned" : "Required"}</StatusBadge>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AnimatedObjectMode({ procedural, step, entryCount }) {
  const activeMode =
    step.action?.animatedObjectMode === "sequential"
      ? "sequential"
      : "together";
  const disabled = entryCount < 2;

  return (
    <div className="rounded-lg border border-secondary-default/40 bg-black/10 p-3">
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-white">
          Animation Playback
        </p>
        <p className="mt-1 text-[9px] leading-4 text-contrast-grayout">
          Choose how multiple animated objects run after a click target is
          triggered.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ANIMATION_MODES.map((mode) => {
          const active = activeMode === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              disabled={disabled}
              onClick={() =>
                procedural.updateStep(step.id, {
                  action: { animatedObjectMode: mode.value },
                })
              }
              className={[
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition",
                "disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "border-accent-main bg-accent-main/15 text-white"
                  : "border-secondary-default/40 bg-primary/40 text-contrast-grayout hover:border-secondary-default/70",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold">
                <MaterialIcon name={mode.icon} className="size-4" />
                {mode.label}
              </span>
              <span className="text-[8px] leading-3">{mode.description}</span>
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="mt-2 text-[9px] text-contrast-grayout">
          Add at least two animated objects to choose a playback mode.
        </p>
      )}
    </div>
  );
}

export default function ProcedureStepObjectSection({
  procedural,
  step,
  isAssembly,
}) {
  const clickTargets = procedural.activeClickTargets || [];
  const animatedEntries = procedural.activeAnimatedEntries || [];

  return (
    <div className="space-y-3">
      {isAssembly ? (
        <MiniLogicalObjectPicker
          key={`${step.id}-assembly-object`}
          procedural={procedural}
          role="animated"
          title="Assembly Object"
          icon="precision_manufacturing"
          assignedReference={step.animatedObject || step.targetObject}
        />
      ) : (
        <>
          <AssignmentGroup
            title="Click Targets"
            description="Clicking any assigned target in Player completes the click condition."
            ready={clickTargets.length > 0}
            count={clickTargets.length}
          >
            <MiniLogicalObjectPicker
              key={`${step.id}-click-target`}
              procedural={procedural}
              role="target"
              title="Click Target"
              icon="ads_click"
              assignedReference={clickTargets[0] || step.targetObject}
              assignedCount={clickTargets.length}
              embedded
              hideHeader
            />

            <ProceduralClickTargetList
              entries={clickTargets}
              onSelect={procedural.selectClickTarget}
              onRemove={procedural.removeClickTarget}
              showHeader={false}
            />
          </AssignmentGroup>

          <AssignmentGroup
            title="Animated Objects"
            description="Add every object that should move after a valid click target is selected."
            ready={animatedEntries.length > 0}
            count={animatedEntries.length}
          >
            <MiniLogicalObjectPicker
              key={`${step.id}-animated-object`}
              procedural={procedural}
              role="animated"
              title="Add Animated Object"
              icon="animation"
              assignedReference={procedural.activeAnimatedEntry?.object}
              embedded
              hideHeader
            />

            <ProceduralAnimatedObjectList
              entries={animatedEntries}
              activeEntryId={procedural.activeAnimatedEntryId}
              onSelect={procedural.selectAnimatedEntry}
              onRemove={procedural.removeAnimatedEntry}
              onUpdate={procedural.updateAnimatedEntry}
            />

            <AnimatedObjectMode
              procedural={procedural}
              step={step}
              entryCount={animatedEntries.length}
            />
          </AssignmentGroup>
        </>
      )}

      <p className="text-[10px] leading-4 text-contrast-grayout">
        {isAssembly
          ? "Select the component that the learner must drag. Use Get Parent repeatedly when the authored target should be a higher logical object."
          : "Click targets use OR logic. Animated objects follow the selected playback mode and can optionally be hidden after their own animation completes."}
      </p>
    </div>
  );
}
