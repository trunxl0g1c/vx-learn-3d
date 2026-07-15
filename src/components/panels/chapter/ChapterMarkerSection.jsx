import { X } from "lucide-react";
import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function ChapterMarkerSection({
  chapter,
  markerMode,
  requestAddMarker,
  deleteMarkerFromActiveChapter,
  cancelAddMarker,
}) {
  const markers = chapter?.markers || [];

  const handleDeleteMarker = (event, markerId) => {
    event.stopPropagation();
    deleteMarkerFromActiveChapter?.(markerId);
  };

  const handleAddMarker = (event) => {
    event.stopPropagation();
    requestAddMarker?.(chapter.id);
  };

  const handleCancelMarker = (event) => {
    event.stopPropagation();
    cancelAddMarker?.();
  };

  return (
    <section className="space-y-2 p-4">
      <div className="text-sm font-normal text-contrast-grayout">Marker</div>

      {markerMode ? (
        <>
          <div className="rounded-lg bg-warning-main px-3 py-2 text-base text-secondary-default">
            Select the point where the marker will be saved on the 3D object
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleCancelMarker}
            className="w-full border-accent-contrast! text-accent-contrast!"
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          {markers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-sm text-contrast-grayout">
              No marker has been set yet
            </div>
          ) : (
            <div
              onClick={(event) => event.stopPropagation()}
              className={[
                "flex max-h-14 overflow-auto w-full flex-wrap items-center gap-1.5",
                "rounded-lg border border-secondary-default",
                "bg-transparent px-2 py-1.5",
                "transition-colors",
                "focus-within:border-accent-main",
              ].join(" ")}
            >
              {markers.map((marker) => {
                const markerLabel = marker.text || marker.name || "Marker";

                return (
                  <div
                    key={marker.id}
                    className={[
                      "inline-flex h-6 max-w-full items-center gap-1",
                      "rounded-full bg-white px-2",
                      "text-[11px] font-normal text-[#25272A]",
                    ].join(" ")}
                  >
                    <span className="max-w-45 truncate">{markerLabel}</span>

                    <button
                      type="button"
                      title="Delete marker"
                      aria-label={`Delete ${markerLabel}`}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => handleDeleteMarker(event, marker.id)}
                      className={[
                        "grid size-4 shrink-0 cursor-pointer place-items-center",
                        "rounded-full text-[#72777F]",
                        "transition-colors",
                        "hover:bg-black/10 hover:text-[#25272A]",
                      ].join(" ")}
                    >
                      <X className="size-3" strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            size="sm"
            variant="cyanOutline"
            onClick={handleAddMarker}
            className="gap-2 text-white bg-dark-alpha rounded-lg!"
          >
            <MaterialIcon
              name="add"
              fill={0}
              size={22}
              className="text-secondary-default"
            />
            Add New Marker
          </Button>
        </>
      )}
    </section>
  );
}
