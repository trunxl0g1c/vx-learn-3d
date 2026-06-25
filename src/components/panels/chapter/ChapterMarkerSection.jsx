import { Plus } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterMarkerSection({
  chapter,
  markerMode,
  requestAddMarker,
  deleteMarkerFromActiveChapter,
  cancelAddMarker,
}) {
  const markers = chapter.markers || [];

  return (
    <section className="space-y-3 px-4 pb-4">
      <div className="text-xs font-bold text-contrast-grayout">Marker</div>

      {markerMode ? (
        <div className="rounded-lg bg-warning-main px-3 text-secondary-default py-2 text-base">
          Select the point where the marker will be saved on the 3D object
        </div>
      ) : markers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-xs text-contrast-grayout">
          No marker has not been set yet
        </div>
      ) : (
        <div className="space-y-2">
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="flex items-center justify-between rounded-lg border border-divider-main bg-primary/80 p-3"
            >
              <div className="text-xs text-white">
                {marker.text || "Marker"}
              </div>

              <Button
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMarkerFromActiveChapter(marker.id);
                }}
              >
                Hapus
              </Button>
            </div>
          ))}
        </div>
      )}

      {markerMode ? (
        <Button
          variant="outline"
          className="w-full border border-accent-contrast! text-accent-contrast!"
          onClick={(e) => {
            e.stopPropagation();
            cancelAddMarker?.();
          }}
        >
          CANCEL
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-2 border-secondary-default text-white"
          onClick={(e) => {
            e.stopPropagation();
            requestAddMarker?.(chapter.id);
          }}
        >
          <Plus className="size-4" />
          Add New Marker
        </Button>
      )}
    </section>
  );
}
