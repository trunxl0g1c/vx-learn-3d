import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import Switch from "../ui/switch";

const EPSILON = 1e-5;

function vectorChanged(start, end) {
  if (!Array.isArray(start) || !Array.isArray(end)) return false;
  return start.some(
    (value, index) => Math.abs(Number(value) - Number(end[index])) > EPSILON,
  );
}

function getMotionSummary(entry) {
  if (!entry?.startTransform || !entry?.endTransform) return "Set Start & End";

  const parts = [];
  if (
    vectorChanged(
      entry.startTransform.position,
      entry.endTransform.position,
    )
  ) {
    parts.push("Move");
  }
  if (
    vectorChanged(
      entry.startTransform.rotation,
      entry.endTransform.rotation,
    )
  ) {
    parts.push("Rotate");
  }
  if (
    vectorChanged(entry.startTransform.scale, entry.endTransform.scale)
  ) {
    parts.push("Scale");
  }

  return parts.length > 0 ? parts.join(" + ") : "Saved · No movement";
}

export default function ProceduralAnimatedObjectList({
  entries = [],
  activeEntryId = null,
  onSelect,
  onRemove,
  onUpdate,
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-secondary-default/40 px-3 py-3 text-center text-[10px] text-contrast-grayout">
        No animation actions yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const active = entry.id === activeEntryId;
        const ready = Boolean(entry.startTransform && entry.endTransform);
        const motionSummary = getMotionSummary(entry);

        return (
          <div
            key={entry.id}
            className={[
              "rounded-lg border p-2",
              active
                ? "border-accent-main bg-accent-main/10"
                : "border-secondary-default/35 bg-primary/40",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect?.(entry.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[10px] font-bold text-secondary-default">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-white">
                    {entry.object?.name || "Animated Object"}
                  </span>
                  <span
                    className={[
                      "block text-[9px]",
                      ready ? "text-green-300" : "text-warning-main",
                    ].join(" ")}
                  >
                    Action {index + 1} · {motionSummary}
                  </span>
                </span>
                {active && (
                  <MaterialIcon
                    name="my_location"
                    className="size-4 shrink-0 text-secondary-default"
                  />
                )}
              </button>

              <Button
                type="button"
                size="xs"
                variant="destructive"
                className="size-7 px-0"
                title="Remove animation action"
                onClick={() => onRemove?.(entry.id)}
              >
                <MaterialIcon name="delete" className="size-4 text-red-300" />
              </Button>
            </div>

            <div className="mt-2 rounded-md border border-secondary-default/25 bg-black/10 px-2.5 py-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-white">Visibility</p>
                <span className="text-[8px] text-contrast-grayout">
                  Persists in this Procedure
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between gap-2 rounded-md border border-secondary-default/15 px-2 py-1.5">
                  <span className="text-[9px] text-contrast-grayout">
                    Show before
                  </span>
                  <Switch
                    checked={entry.showBeforeAnimation === true}
                    onCheckedChange={(checked) =>
                      onUpdate?.(entry.id, { showBeforeAnimation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-md border border-secondary-default/15 px-2 py-1.5">
                  <span className="text-[9px] text-contrast-grayout">
                    Hide after
                  </span>
                  <Switch
                    checked={entry.hideAfterAnimation === true}
                    onCheckedChange={(checked) =>
                      onUpdate?.(entry.id, { hideAfterAnimation: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
