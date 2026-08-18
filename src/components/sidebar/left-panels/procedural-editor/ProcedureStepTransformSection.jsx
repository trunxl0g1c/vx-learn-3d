import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

const TRANSFORM_MODES = [
  ["translate", "Move", "open_with"],
  ["rotate", "Rotate", "360"],
  ["scale", "Scale", "zoom_out_map"],
];

export default function ProcedureStepTransformSection({
  procedural,
  step,
  isAssembly,
}) {
  const activeEntry = procedural.activeAnimatedEntry || null;
  const activeEntries = procedural.activeAnimatedEntries || [];
  const activeIndex = activeEntry
    ? activeEntries.findIndex((entry) => entry.id === activeEntry.id)
    : -1;

  const content = (
    <>
      {!isAssembly && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-main/35 bg-accent-main/10 px-2.5 py-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[9px] font-bold text-secondary-default">
            {activeIndex >= 0 ? activeIndex + 1 : "-"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase tracking-wide text-contrast-grayout">
              Active animation action
            </span>
            <span className="block truncate text-[11px] font-semibold text-white">
              {activeEntry?.object?.name || "Select an animation action above"}
            </span>
          </span>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-xs text-contrast-grayout">
          Gizmo Mode
        </span>
        <div className="grid grid-cols-3 gap-2">
          {TRANSFORM_MODES.map(([mode, label, icon]) => (
            <Button
              key={mode}
              type="button"
              size="xs"
              variant={
                procedural.transformMode === mode ? "default" : "darkOutline"
              }
              onClick={() => procedural.setTransformMode(mode)}
            >
              <MaterialIcon name={icon} className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!procedural.activeAnimatedEntry}
          onClick={procedural.captureStartTransform}
        >
          <MaterialIcon name="flag" className="size-4" />
          Update Start
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!procedural.activeAnimatedEntry}
          onClick={procedural.captureEndTransform}
        >
          <MaterialIcon name="sports_score" className="size-4" />
          {isAssembly ? "Update Target" : "Update End"}
        </Button>
      </div>

      <div className="mt-3 rounded-lg border border-secondary-default/40 bg-primary/40 p-2.5 text-[10px] leading-4 text-contrast-grayout">
        {isAssembly
          ? "Start and Target are saved automatically from the object's current pose when it is added. Move/rotate the component, then use Update Target only when the installed pose should change."
          : "Start and End are saved automatically from the object's current pose when the Animation Action is added. If the object does not move, no extra save is needed. Use Update Start/End only after changing the pose."}
      </div>

      {isAssembly && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!step.startTransform}
            onClick={procedural.showActiveStepStart}
          >
            <MaterialIcon name="first_page" className="size-4" />
            Show Start
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!step.endTransform}
            onClick={procedural.showActiveStepTarget}
          >
            <MaterialIcon name="my_location" className="size-4" />
            Show Target
          </Button>
        </div>
      )}
    </>
  );

  if (isAssembly) return content;

  return (
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[9px] font-bold text-secondary-default">
          3
        </span>
        <div>
          <p className="text-xs font-semibold text-white">Set Start & End</p>
          <p className="mt-0.5 text-[10px] text-contrast-grayout">
            Configure the selected animation action.
          </p>
        </div>
      </div>
      {content}
    </section>
  );
}
