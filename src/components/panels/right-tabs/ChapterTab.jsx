import ChapterEmptyState from "../chapter/ChapterEmptyState";
import ChapterIdentitySection from "../chapter/ChapterIdentitySection";
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection";
import ChapterParameterSection from "../chapter/ChapterParameterSection";
import ChapterMarkerSection from "../chapter/ChapterMarkerSection";
import ChapterCameraSection from "../chapter/ChapterCameraSection";
import ChapterVisualStateSection from "../chapter/ChapterVisualStateSection";
import ChapterAnimationSection from "../chapter/ChapterAnimationSection";
import ChapterMediaSection from "../chapter/ChapterMediaSection";
import ChapterDeselectButton from "../chapter/ChapterDeselectButton";
import ChapterDeleteButton from "../chapter/ChapterDeleteButton";
import Button, { cn } from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";

export default function ChapterTab(props) {
  const {
    variant = "detail",
    material,
    activeChapterId,
    setActiveChapterId,
    previewChapterInEditor,
    createChapterFromSelectedObject,
    selectedObjectName,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    saveVisualStateToActiveChapter,
    saveCameraViewToActiveChapter,
    animations,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    requestAddMarker,
    cancelAddMarker,
    markerMode,
    setRightTab,
  } = props;

  const chapters = material?.chapters || [];
  const activeChapter = chapters.find(
    (chapter) => chapter.id === activeChapterId,
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
          ) : (
            <div className="rounded-2xl">
              <ChapterMarkerSection
                chapter={activeChapter}
                markerMode={markerMode}
                requestAddMarker={requestAddMarker}
                cancelAddMarker={cancelAddMarker}
                deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
              />

              <ChapterDeselectButton setActiveChapterId={setActiveChapterId} />
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
              disabled={!selectedObjectName || Boolean(activeChapterId)}
              title={
                activeChapterId
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
            chapters.map((chapter) => {
              const isActive = activeChapterId === chapter.id;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => openChapterDetail(chapter.id)}
                  className={cn(
                    "mx-4 mb-3 flex w-[calc(100%-2rem)] cursor-pointer items-center justify-between gap-3 rounded-lg border border-contrast-grayout bg-dark-alpha p-3 text-left transition",
                    "hover:border-secondary-default hover:bg-primary/50",
                    isActive && "border-secondary-default bg-primary",
                  )}
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
        ) : (
          <>
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

            <ChapterVisualStateSection
              chapter={activeChapter}
              saveVisualStateToActiveChapter={
                saveVisualStateToActiveChapter
              }
            />

            <ChapterCameraSection
              panelSectionStyle={panelSectionStyle}
              saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
            />

            <ChapterAnimationSection
              chapter={activeChapter}
              panelSectionStyle={panelSectionStyle}
              animations={animations}
              isChapterAnimationSelected={isChapterAnimationSelected}
              getChapterAnimationConfig={getChapterAnimationConfig}
              toggleChapterAnimation={toggleChapterAnimation}
              updateChapterAnimationField={updateChapterAnimationField}
              playAnimationPreview={playAnimationPreview}
              stopAnimationPreview={stopAnimationPreview}
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

      {activeChapter && (
        <div className="shrink-0">
          <ChapterDeselectButton
            selectedObjectName={selectedObjectName}
            setActiveChapterId={setActiveChapterId}
            setRightTab={setRightTab}
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
