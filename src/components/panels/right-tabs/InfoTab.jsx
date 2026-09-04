import { Copy } from "lucide-react";
import Button from "../../ui/button";
import { findExactChapterForObject } from "../../../engine/selection";

export default function InfoTab({
  material,
  modelScene,
  selectedObject,
  selectedObjectName,
  setActiveChapterId,
  setRightTab,
  deselectObject,
  createChapterFromSelectedObject,
  contentAuthoringLocked = false,
  contentAuthoringLockReason = "",
}) {
  const chapters = material?.chapters || [];

  const objectChapter =
    findExactChapterForObject(selectedObject, chapters, modelScene) ||
    chapters.find((chapter) => {
      const chapterName = String(chapter?.objectName || "")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const selectedName = String(selectedObjectName || "")
        .replaceAll("_", " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      return selectedName && chapterName === selectedName;
    }) ||
    null;

  const hasContent = Boolean(objectChapter);
  const parameters = (objectChapter?.parameters || []).filter((parameter) =>
    Boolean(
      String(parameter?.name || "").trim() ||
        String(parameter?.value ?? "").trim() ||
        String(parameter?.unit || "").trim(),
    ),
  );

  const handleContentAction = () => {
    if (contentAuthoringLocked) return;

    if (hasContent) {
      setActiveChapterId(objectChapter.id);
      setRightTab("chapter");
      return;
    }

    createChapterFromSelectedObject?.();
  };

  return (
    <div className="flex flex-col">
      {parameters.length > 0 && (
        <div className="border-b border-divider-main p-3">
          <div className="flex flex-col gap-2">
            {parameters.map((parameter, index) => (
              <InfoPropertyRow
                key={parameter.id || `${parameter.name}-${index}`}
                label={parameter.name || `Parameter ${index + 1}`}
                value={parameter.value ?? ""}
                unit={parameter.unit || ""}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <Button
            variant="gold"
            className="flex-1"
            onClick={() => {
              deselectObject?.();
            }}
          >
            DESELECT
          </Button>

          <Button
            onClick={handleContentAction}
            variant="outline"
            className="flex-1 border-accent-contrast!"
            disabled={contentAuthoringLocked}
            title={contentAuthoringLockReason || undefined}
            aria-disabled={contentAuthoringLocked}
          >
            {hasContent ? "EDIT DESCRIPTION OBJECT" : "CREATE DESCRIPTION"}
          </Button>
        </div>

        {contentAuthoringLocked && (
          <div className="mt-3 rounded-lg border border-warning-main/40 bg-warning-main/10 px-3 py-2 text-xs leading-5 text-secondary-default">
            {contentAuthoringLockReason ||
              "Object description authoring is unavailable while a Pro authoring tool is active."}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoPropertyRow({ label, value, unit }) {
  return (
    <div className="grid min-h-[30px] grid-cols-[155px_1fr_34px] overflow-hidden rounded-lg border border-divider-main bg-dark-alpha">
      <div className="flex items-center border-r border-divider-main px-3 text-sm font-normal text-secondary-default">
        {label}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 text-sm text-white">
        <span className="line-clamp-2 leading-5">{value}</span>
        {unit && <span className="shrink-0 font-medium">{unit}</span>}
      </div>

      <button
        type="button"
        className="grid place-items-center text-secondary-default transition hover:bg-white/5 hover:text-white"
      >
        <Copy size={16} />
      </button>
    </div>
  );
}
