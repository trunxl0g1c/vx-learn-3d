import ProceduralAnimatedObjectList from "../../../procedural/ProceduralAnimatedObjectList";
import ProceduralClickTargetList from "../../../procedural/ProceduralClickTargetList";
import MaterialIcon from "../../../ui/material-icon";
import MiniLogicalObjectPicker from "./MiniLogicalObjectPicker";
import { StatusBadge } from "./PanelPrimitives";

const ANIMATION_MODES = [
  { value: "together", label: "Together", icon: "animation" },
  { value: "sequential", label: "Sequential", icon: "format_list_numbered" },
];

function AssignmentGroup({ title, ready, count = 0, children }) {
  return (
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-normal text-white">{title}</p>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span className="rounded-full border border-secondary-default/40 px-2 py-1 text-[9px] text-secondary-default">
              {count}
            </span>
          )}
          <StatusBadge ready={ready}>
            {ready ? "Ready" : "Required"}
          </StatusBadge>
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
      <p className="mb-2 text-xs font-normal text-white">Playback Order</p>

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
                "flex min-h-12 w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition",
                "disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "border-accent-main bg-accent-main/15 text-white"
                  : "border-secondary-default/35 bg-primary/40 text-contrast-grayout hover:border-secondary-default/70",
              ].join(" ")}
            >
              <MaterialIcon name={mode.icon} size={20} />
              <span className="text-xs font-normal">{mode.label}</span>
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
    animatedEntries[0]?.object ||
    step.animatedObject ||
    step.targetObject ||
    null;

  if (isAssembly) {
    return (
      <AssignmentGroup
        title="Choose Assembly Object"
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
              size={20}
              className="shrink-0 text-green-300"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
                Assembly object
              </span>
              <span className="block truncate text-xs font-normal text-white">
                {assemblyReference.name || "Assigned object"}
              </span>
            </span>
          </div>
        )}
      </AssignmentGroup>
    );
  }

  return (
    <div className="space-y-3">
      <AssignmentGroup
        title="Choose Click Target"
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
        title="Add Animation Actions"
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
    </div>
  );
}
