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
}) {
  const cameraPosition = Array.isArray(chapter?.cameraPosition)
    ? chapter.cameraPosition
    : [];

  const hasSavedCameraView =
    chapter?.cameraViewSaved === true && cameraPosition.length >= 3;

  const [cameraX = 0, cameraY = 0, cameraZ = 0] = cameraPosition;

  const handleSave = (event) => {
    event.stopPropagation();
    saveCameraViewToActiveChapter?.();
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    deleteCameraViewFromActiveChapter?.();
  };

  return (
    <section className="space-y-3 p-4">
      <div className="text-sm font-normal text-contrast-grayout">
        Camera View
      </div>

      {!hasSavedCameraView ? (
        <div className="rounded-lg border border-dashed border-divider-main px-3 py-3 text-sm text-contrast-grayout">
          No camera view has been captured yet
        </div>
      ) : (
        <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-secondary-default px-4 py-2 text-sm text-white">
          <span className="min-w-0 truncate">
            Camera View (
            {`X:${formatCoordinate(cameraX)},Y:${formatCoordinate(
              cameraY,
            )},Z:${formatCoordinate(cameraZ)}`}
            )
          </span>

          <button
            type="button"
            title="Delete camera view"
            aria-label="Delete camera view"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleDelete}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/5 hover:text-accent-main"
          >
            <MaterialIcon
              name="delete"
              fill={1}
              size={18}
              className="text-current"
            />
          </button>
        </div>
      )}

      <Button
        size="sm"
        type="button"
        variant="cyanOutline"
        onClick={handleSave}
        className="h-10 gap-3 rounded-lg! bg-dark-alpha px-4 text-sm font-normal text-white"
      >
        <MaterialIcon
          name="save"
          fill={1}
          size={24}
          className="text-secondary-default"
        />
        Save Camera View
      </Button>
    </section>
  );
}
