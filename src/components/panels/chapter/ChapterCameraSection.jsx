import { useEffect, useMemo, useState } from "react";
import { getChapterCameraViews } from "../../../engine/chapter";
import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

function formatCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number(number.toFixed(2));
}

export default function ChapterCameraSection({
  chapter,
  saveCameraViewToActiveChapter,
  deleteCameraViewFromActiveChapter,
  previewChapterInEditor,
  updateChapterField,
}) {
  const cameraViews = useMemo(() => getChapterCameraViews(chapter), [chapter]);
  const [newCaption, setNewCaption] = useState("");

  useEffect(() => {
    setNewCaption("");
  }, [chapter?.id]);

  const handleAdd = (event) => {
    event.stopPropagation();
    const saved = saveCameraViewToActiveChapter?.({ caption: newCaption });
    if (saved !== false) setNewCaption("");
  };

  const handleCaptionChange = (cameraViewId, caption) => {
    if (!chapter?.id) return;

    const nextViews = cameraViews.map((view) =>
      view.id === cameraViewId ? { ...view, caption } : view,
    );

    updateChapterField?.(chapter.id, "cameraViews", nextViews);
  };

  return (
    <section className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-normal text-contrast-grayout">
          Camera Views
        </div>
        <div className="rounded-full border border-divider-main px-2 py-0.5 text-[11px] text-secondary-default">
          {cameraViews.length} saved
        </div>
      </div>

      {cameraViews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm text-contrast-grayout">
          No camera view has been captured yet
        </div>
      ) : (
        <div className="space-y-2">
          {cameraViews.map((view, index) => {
            const [cameraX = 0, cameraY = 0, cameraZ = 0] = view.position || [];
            const modeLabel =
              view.cameraType === "orthographic"
                ? "Orthographic"
                : "Perspective";

            return (
              <div
                key={view.id}
                className="rounded-xl border border-secondary-default/70 bg-dark-alpha p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-white">
                    Camera {index + 1}/{cameraViews.length}
                  </div>
                  <div className="rounded-full border border-divider-main px-2 py-0.5 text-[10px] text-secondary-default">
                    {modeLabel}
                  </div>
                </div>

                <label
                  htmlFor={`chapter-camera-caption-${view.id}`}
                  className="mb-1 block text-[11px] text-contrast-grayout"
                >
                  Caption
                </label>
                <input
                  id={`chapter-camera-caption-${view.id}`}
                  name={`chapterCameraCaption-${view.id}`}
                  type="text"
                  value={view.caption || ""}
                  placeholder={`Camera ${index + 1}`}
                  onChange={(event) =>
                    handleCaptionChange(view.id, event.target.value)
                  }
                  className="h-9 w-full rounded-lg border border-divider-main bg-primary/80 px-3 text-sm text-white outline-none transition focus:border-secondary-default"
                />

                <div className="mt-2 truncate text-[10px] text-contrast-grayout">
                  X:{formatCoordinate(cameraX)}, Y:{formatCoordinate(cameraY)}, Z:
                  {formatCoordinate(cameraZ)}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    size="xs"
                    type="button"
                    variant="cyanOutline"
                    onClick={(event) => {
                      event.stopPropagation();
                      previewChapterInEditor?.(chapter.id, view.id);
                    }}
                    className="h-9 gap-1 px-2 text-xs"
                  >
                    <MaterialIcon name="visibility" size={16} />
                    View
                  </Button>

                  <Button
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      saveCameraViewToActiveChapter?.({
                        cameraViewId: view.id,
                        caption: view.caption,
                      });
                    }}
                    className="h-9 gap-1 px-2 text-xs"
                  >
                    <MaterialIcon name="update" size={16} />
                    Update
                  </Button>

                  <Button
                    size="xs"
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCameraViewFromActiveChapter?.(view.id);
                    }}
                    className="h-9 gap-1 px-2 text-xs text-red-300"
                  >
                    <MaterialIcon name="delete" size={16} />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-divider-main bg-primary/40 p-3">
        <label
          htmlFor="new-chapter-camera-caption"
          className="mb-1 block text-[11px] text-contrast-grayout"
        >
          New camera caption
        </label>
        <input
          id="new-chapter-camera-caption"
          name="newChapterCameraCaption"
          type="text"
          value={newCaption}
          placeholder={`Camera ${cameraViews.length + 1}`}
          onChange={(event) => setNewCaption(event.target.value)}
          className="mb-2 h-9 w-full rounded-lg border border-divider-main bg-primary/80 px-3 text-sm text-white outline-none transition focus:border-secondary-default"
        />

        <Button
          size="sm"
          type="button"
          variant="cyanOutline"
          onClick={handleAdd}
          className="h-10 w-full gap-3 rounded-lg! bg-dark-alpha px-4 text-sm font-normal text-white"
        >
          <MaterialIcon
            name="add_a_photo"
            fill={1}
            size={22}
            className="text-secondary-default"
          />
          Add Current Camera View
        </Button>
      </div>
    </section>
  );
}
