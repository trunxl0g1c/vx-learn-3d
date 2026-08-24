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

  return (
    <section className="rounded-xl border border-secondary-default/55 bg-primary/50 p-3">
      <div className="mb-3 flex items-start gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[9px] font-bold text-secondary-default">
          {isAssembly ? "2" : "3"}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">
            {isAssembly ? "Set Start & Target" : "Set Start & End"}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-contrast-grayout">
            {isAssembly
              ? "Start and Target are already saved when the object is assigned. Move the object only when you want to change either pose."
              : "Configure the selected animation action."}
          </p>
        </div>
      </div>

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

      {isAssembly && activeEntry?.object && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent-main/35 bg-accent-main/10 px-2.5 py-2">
          <MaterialIcon name="precision_manufacturing" className="size-4 text-secondary-default" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">
            {activeEntry.object.name || "Assembly object"}
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
          disabled={!activeEntry}
          onClick={procedural.captureStartTransform}
        >
          <MaterialIcon name="flag" className="size-4" />
          Update Start
        </Button>
        <Button
          type="button"
          size="xs"
          variant="darkOutline"
          disabled={!activeEntry}
          onClick={procedural.captureEndTransform}
        >
          <MaterialIcon name="sports_score" className="size-4" />
          {isAssembly ? "Update Target" : "Update End"}
        </Button>
      </div>

      <div className="mt-3 rounded-lg border border-secondary-default/35 bg-black/10 p-2.5 text-[9px] leading-4 text-contrast-grayout">
        {isAssembly
          ? "Simple flow: assign object → move it to the install position → Update Target. Update Start is only needed when the initial pose changes."
          : "Start and End are saved automatically when the Animation Action is added. If the object does not move, no extra save is needed."}
      </div>

      {isAssembly && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!activeEntry?.startTransform}
            onClick={procedural.showActiveStepStart}
          >
            <MaterialIcon name="first_page" className="size-4" />
            Show Start
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            disabled={!activeEntry?.endTransform}
            onClick={procedural.showActiveStepTarget}
          >
            <MaterialIcon name="my_location" className="size-4" />
            Show Target
          </Button>
        </div>
      )}
    </section>
  );
}
