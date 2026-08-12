import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

export default function ProceduralClickTargetList({
  entries = [],
  onSelect,
  onRemove,
  showHeader = true,
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-secondary-default/40 px-3 py-4 text-center text-[10px] text-contrast-grayout">
        No click targets added yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-contrast-grayout">
            Assigned Click Targets
          </p>
          <span className="rounded-full border border-secondary-default/40 px-2 py-0.5 text-[9px] text-secondary-default">
            {entries.length}
          </span>
        </div>
      )}

      {entries.map((entry, index) => (
        <div
          key={`${entry?.uuid || entry?.name || "target"}-${index}`}
          className="flex items-center gap-2 rounded-lg border border-secondary-default/40 bg-primary/50 p-2"
        >
          <button
            type="button"
            onClick={() => onSelect?.(entry)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title="Select this click target in the viewport"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main/20 text-[10px] font-bold text-secondary-default">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-white">
                {entry?.name || "Click Target"}
              </span>
              <span className="block text-[9px] text-green-300">
                Any one target can complete the click condition
              </span>
            </span>
            <MaterialIcon
              name="my_location"
              className="size-4 shrink-0 text-secondary-default"
            />
          </button>

          <Button
            type="button"
            size="xs"
            variant="destructive"
            className="size-8 px-0"
            title="Remove click target"
            onClick={() => onRemove?.(entry)}
          >
            <MaterialIcon name="delete" className="size-4 text-red-300" />
          </Button>
        </div>
      ))}
    </div>
  );
}
