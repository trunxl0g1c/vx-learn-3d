import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

function getEntryStatus(entry) {
  return entry?.startTransform && entry?.endTransform ? "Ready" : "Set transforms";
}

export default function ProceduralAnimatedObjectList({
  entries = [],
  activeEntryId = null,
  onSelect,
  onRemove,
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-secondary-default/40 px-3 py-4 text-center text-[10px] text-contrast-grayout">
        No animated objects added yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const active = entry.id === activeEntryId;
        const ready = Boolean(entry.startTransform && entry.endTransform);

        return (
          <div
            key={entry.id}
            className={[
              "flex items-center gap-2 rounded-lg border p-2",
              active
                ? "border-accent-main bg-accent-main/10"
                : "border-secondary-default/40 bg-primary/50",
            ].join(" ")}
          >
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
                  {getEntryStatus(entry)}
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
              className="size-8 px-0"
              title="Remove animated object"
              onClick={() => onRemove?.(entry.id)}
            >
              <MaterialIcon name="delete" className="size-4 text-red-300" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
