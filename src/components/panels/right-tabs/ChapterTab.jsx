import ChapterEmptyState from "../chapter/ChapterEmptyState";
import ChapterIdentitySection from "../chapter/ChapterIdentitySection";
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection";
import ChapterParameterSection from "../chapter/ChapterParameterSection";
import ChapterMarkerSection from "../chapter/ChapterMarkerSection";
import ChapterCameraSection from "../chapter/ChapterCameraSection";
import ChapterAnimationSection from "../chapter/ChapterAnimationSection";
import ChapterFlowSection from "../chapter/ChapterFlowSection";
import ChapterMediaSection from "../chapter/ChapterMediaSection";
import ChapterDeselectButton from "../chapter/ChapterDeselectButton";
import ChapterDeleteButton from "../chapter/ChapterDeleteButton";
import Button, { cn } from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";
import InlineAlert from "../../ui/inline-alert";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";

export default function ChapterTab(props) {
  const {
    chapterFeedback,
    clearChapterFeedback,
    variant = "detail",
    material,
    activeChapterId,
    setActiveChapterId,
    previewChapterInEditor,
    createChapterFromSelectedObject,
    contentAuthoringLocked = false,
    contentAuthoringLockReason = "",
    selectedObjectName,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    saveCameraViewToActiveChapter,
    animations,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    addChapterAnimation,
    updateChapterAnimation,
    removeChapterAnimation,
    addChapterFlow,
    updateChapterFlow,
    removeChapterFlow,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    moveChapter,
    requestAddMarker,
    cancelAddMarker,
    markerMode,
    setRightTab,
    deselectObject,
    deleteCameraViewFromActiveChapter,
  } = props;

  const chapters = material?.chapters || [];
  const activeChapter = chapters.find(
    (chapter) => chapter.id === activeChapterId,
  );
  const isLoadingActiveChapter = isLazyMaterialRecord(
    activeChapter,
    "chapters",
  );

  const openChapterDetail = (chapterId) => {
    if (previewChapterInEditor) {
      previewChapterInEditor(chapterId);
      return;
    }

    setActiveChapterId(chapterId);
    setRightTab?.("chapter");
  };

  if (markerMode) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
          Chapter Marker
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {!activeChapter ? (
            <ChapterEmptyState />
          ) : isLoadingActiveChapter ? (
            <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-grayout-main">
              Loading chapter content...
            </div>
          ) : (
            <div className="rounded-2xl">
              <ChapterMarkerSection
                chapter={activeChapter}
                markerMode={markerMode}
                requestAddMarker={requestAddMarker}
                cancelAddMarker={cancelAddMarker}
                deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
              />

              <ChapterDeselectButton
                selectedObjectName={selectedObjectName}
                setActiveChapterId={setActiveChapterId}
                setRightTab={setRightTab}
                deselectObject={deselectObject}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
          Chapter List
        </div>

        <div className="sidebar-scroll mb-5 min-h-0 flex-1 overflow-y-auto pb-10">
          <div className="m-3 rounded-2xl bg-dark-alpha p-3">
            <Button
              size="sm"
              onClick={createChapterFromSelectedObject}
              disabled={
                contentAuthoringLocked ||
                !selectedObjectName ||
                Boolean(activeChapterId)
              }
              title={
                contentAuthoringLocked
                  ? contentAuthoringLockReason ||
                    "Create Content is disabled while a Pro authoring tool is active."
                  : activeChapterId
                    ? "Deselect the active chapter before creating a new one"
                    : undefined
              }
              className="w-full"
            >
              Create Chapter from Selected Object
            </Button>
          </div>

          {chapters.length === 0 ? (
            <ChapterEmptyState />
          ) : (
            chapters.map((chapter, index) => {
              const isActive = activeChapterId === chapter.id;
              const canMoveUp = index > 0;
              const canMoveDown = index < chapters.length - 1;

              return (
                <div
                  key={chapter.id}
                  className={cn(
                    "mx-4 mb-3 flex w-[calc(100%-2rem)] items-stretch overflow-hidden rounded-lg border border-contrast-grayout bg-dark-alpha transition",
                    "hover:border-accent-main hover:bg-primary/50",
                    isActive && "border-accent-main! bg-primary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openChapterDetail(chapter.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 p-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <h1 className="truncate text-sm font-normal text-white">
                        {chapter.title || "Untitled Chapter"}
                      </h1>

                      <p className="mt-1 line-clamp-2 text-xs text-grayout-main">
                        {chapter.description || "No description"}
                      </p>
                    </div>

                    <MaterialIcon
                      name="subdirectory_arrow_right"
                      fill={1}
                      className="size-6 shrink-0 text-secondary-default"
                    />
                  </button>

                  <div className="flex w-10 shrink-0 flex-col border-l border-divider-main">
                    <button
                      type="button"
                      disabled={!canMoveUp}
                      onClick={() => moveChapter?.(chapter.id, "up")}
                      title="Move chapter up"
                      aria-label={`Move ${chapter.title || "chapter"} up`}
                      className={cn(
                        "grid flex-1 place-items-center border-b border-divider-main transition",
                        canMoveUp
                          ? "cursor-pointer text-secondary-default hover:bg-secondary-default/15"
                          : "cursor-not-allowed text-grayout-main/25",
                      )}
                    >
                      <MaterialIcon name="keyboard_arrow_up" size={20} />
                    </button>

                    <button
                      type="button"
                      disabled={!canMoveDown}
                      onClick={() => moveChapter?.(chapter.id, "down")}
                      title="Move chapter down"
                      aria-label={`Move ${chapter.title || "chapter"} down`}
                      className={cn(
                        "grid flex-1 place-items-center transition",
                        canMoveDown
                          ? "cursor-pointer text-secondary-default hover:bg-secondary-default/15"
                          : "cursor-not-allowed text-grayout-main/25",
                      )}
                    >
                      <MaterialIcon name="keyboard_arrow_down" size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* <div className="flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
        Chapter Detail
      </div> */}
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {!activeChapter ? (
          <ChapterEmptyState />
        ) : isLoadingActiveChapter ? (
          <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-grayout-main">
            Loading chapter content...
          </div>
        ) : (
          <>
            <div className="px-4">
              <InlineAlert
                type={chapterFeedback?.type || "error"}
                message={chapterFeedback?.message}
                duration={3000}
                onClose={clearChapterFeedback}
              />
            </div>

            <ChapterIdentitySection
              chapter={activeChapter}
              panelSectionStyle={panelSectionStyle}
              inputStyle={inputStyle}
              setActiveChapterId={setActiveChapterId}
              updateChapterField={updateChapterField}
            />

            <ChapterDescriptionSection
              chapter={activeChapter}
              panelSectionStyle={panelSectionStyle}
              inputStyle={inputStyle}
              updateChapterField={updateChapterField}
            />

            <ChapterParameterSection
              chapter={activeChapter}
              panelSectionStyle={panelSectionStyle}
              inputStyle={inputStyle}
              addChapterParameter={addChapterParameter}
              updateChapterParameter={updateChapterParameter}
              deleteChapterParameter={deleteChapterParameter}
            />

            <ChapterMarkerSection
              chapter={activeChapter}
              markerMode={markerMode}
              requestAddMarker={requestAddMarker}
              cancelAddMarker={cancelAddMarker}
              deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
            />

            <ChapterCameraSection
              chapter={activeChapter}
              saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
              deleteCameraViewFromActiveChapter={
                deleteCameraViewFromActiveChapter
              }
              previewChapterInEditor={previewChapterInEditor}
              updateChapterField={updateChapterField}
            />

            <ChapterAnimationSection
              chapter={activeChapter}
              animations={animations}
              addChapterAnimation={addChapterAnimation}
              updateChapterAnimation={updateChapterAnimation}
              removeChapterAnimation={removeChapterAnimation}
            />

            <ChapterFlowSection
              chapter={activeChapter}
              flows={material?.flows || []}
              addChapterFlow={addChapterFlow}
              updateChapterFlow={updateChapterFlow}
              removeChapterFlow={removeChapterFlow}
            />

            <ChapterMediaSection
              chapter={activeChapter}
              panelSectionStyle={panelSectionStyle}
              mediaButtonStyle={mediaButtonStyle}
              addChapterMedia={addChapterMedia}
              deleteChapterMedia={deleteChapterMedia}
            />
          </>
        )}
      </div>

      {activeChapter && !isLoadingActiveChapter && (
        <div className="shrink-0">
          <ChapterDeselectButton
            selectedObjectName={selectedObjectName}
            setActiveChapterId={setActiveChapterId}
            setRightTab={setRightTab}
            deselectObject={deselectObject}
          />

          <ChapterDeleteButton
            chapter={activeChapter}
            onDelete={deleteChapterContent}
          />
        </div>
      )}
    </div>
  );
}
