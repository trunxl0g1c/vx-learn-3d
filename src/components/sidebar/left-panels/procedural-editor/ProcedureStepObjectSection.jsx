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
    description:
      "Different objects can start together. Repeated actions on the same object stay chained.",
  },
  {
    value: "sequential",
    label: "Sequential",
    icon: "format_list_numbered",
    description: "Run every animation action one-by-one in the listed order.",
  },
];

function AssignmentGroup({
  stepNumber,
  title,
  description,
  ready,
  count = 0,
  children,
}) {
  return (
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {stepNumber && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[9px] font-bold text-secondary-default">
                {stepNumber}
              </span>
            )}
            <p className="text-xs font-semibold text-white">{title}</p>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-contrast-grayout">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span className="rounded-full border border-secondary-default/40 px-2 py-1 text-[9px] text-secondary-default">
              {count}
            </span>
          )}
          <StatusBadge ready={ready}>{ready ? "Ready" : "Required"}</StatusBadge>
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
    <div className="rounded-lg border border-secondary-default/35 bg-black/10 p-2.5">
      <div className="mb-2">
        <p className="text-[10px] font-semibold text-white">Playback Order</p>
        <p className="mt-0.5 text-[9px] leading-4 text-contrast-grayout">
          Only matters when there is more than one animation action.
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
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition",
                "disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "border-accent-main bg-accent-main/15 text-white"
                  : "border-secondary-default/35 bg-primary/40 text-contrast-grayout hover:border-secondary-default/70",
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
  const assemblyReference =
    animatedEntries[0]?.object || step.animatedObject || step.targetObject || null;

  if (isAssembly) {
    return (
      <AssignmentGroup
        stepNumber="1"
        title="Choose Assembly Object"
        description="Select the component the learner will drag, then use it as the Assembly Object."
        ready={Boolean(assemblyReference)}
      >
        <MiniLogicalObjectPicker
          key={`${step.id}-assembly-object`}
          procedural={procedural}
          role="assembly"
          title="Assembly Object"
          icon="precision_manufacturing"
          assignedReference={assemblyReference}
          embedded
          hideHeader
        />

        {assemblyReference && (
          <div className="flex items-center gap-2 rounded-lg border border-green-400/25 bg-green-500/5 px-2.5 py-2">
            <MaterialIcon
              name="check_circle"
              className="size-4 shrink-0 text-green-300"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
                Assembly object
              </span>
              <span className="block truncate text-[11px] font-semibold text-white">
                {assemblyReference.name || "Assigned object"}
              </span>
            </span>
          </div>
        )}

        <p className="text-[9px] leading-4 text-contrast-grayout">
          Start and Target are created automatically when the object is assigned.
          Use Parent only when the draggable part should be a higher logical object.
        </p>
      </AssignmentGroup>
    );
  }

  return (
    <div className="space-y-3">
      <AssignmentGroup
        stepNumber="1"
        title="Choose Click Target"
        description="Select an object in the viewport, then add it as a target. Clicking any one target will trigger this step."
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
        stepNumber="2"
        title="Add Animation Actions"
        description="Add one action for every movement. The same object can be added again for a second action, such as Move first, then Rotate."
        ready={animatedEntries.length > 0}
        count={animatedEntries.length}
      >
        <MiniLogicalObjectPicker
          key={`${step.id}-animated-object`}
          procedural={procedural}
          role="animated"
          title="Add Animation Action"
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

      <p className="text-[10px] leading-4 text-contrast-grayout">
        Tip: for Move → Rotate on one object, save the first action End, then add
        the same object again. The new action automatically starts from the previous End.
      </p>
    </div>
  );
}
