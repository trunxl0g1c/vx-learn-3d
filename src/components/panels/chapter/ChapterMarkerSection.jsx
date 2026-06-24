import { Plus } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterMarkerSection({
  chapter,
  deleteMarkerFromActiveChapter,
}) {
  const markers = chapter.markers || [];

  return (
    <section className="space-y-3 px-2 pb-4">
      <div className="text-xs font-bold text-contrast-grayout">Marker</div>

      {markers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-2 text-xs text-contrast-grayout">
          No marker has not been set yet
        </div>
      ) : (
        <div className="space-y-2">
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="rounded-lg border border-divider-main bg-primary p-3 flex justify-between items-center"
            >
              <div className="mb-2 text-xs text-white">{marker.text}</div>

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

      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-secondary-default text-white"
      >
        <Plus className="size-4" />
        Add New Marker
      </Button>
    </section>
  );
}
