import ChapterEmptyState from "../chapter/ChapterEmptyState";
import ChapterIdentitySection from "../chapter/ChapterIdentitySection";
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection";
import ChapterParameterSection from "../chapter/ChapterParameterSection";
import ChapterMarkerSection from "../chapter/ChapterMarkerSection";
import ChapterCameraSection from "../chapter/ChapterCameraSection";
import ChapterAnimationSection from "../chapter/ChapterAnimationSection";
import ChapterMediaSection from "../chapter/ChapterMediaSection";
import ChapterDeselectButton from "../chapter/ChapterDeselectButton";
import Button, { cn } from "../../ui/button";

export default function ChapterTab(props) {
  const {
    material,
    activeChapterId,
    setActiveChapterId,
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
    requestAddMarker,
    cancelAddMarker,
    markerMode,
  } = props;

  const chapters = material?.chapters || [];

  const activeChapter = chapters.find(
    (chapter) => chapter.id === activeChapterId,
  );

  if (markerMode) {
    return (
      <div className="flex flex-col gap-1 p-3">
        {!activeChapter ? (
          <ChapterEmptyState />
        ) : (
          <div className="rounded-2xl">
            {/* <div className="mb-3 text-base font-normal">
              {activeChapter.title || "Untitled Chapter"}
            </div> */}
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
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="m-3 rounded-2xl bg-dark-alpha p-3">
        {/* <div className="mb-2 text-sm text-secondary-default">
          Object Selected
        </div>

        <div className="mb-3 text-base font-normal">
          {selectedObjectName || "-"}
        </div> */}

        <Button
          size="sm"
          onClick={createChapterFromSelectedObject}
          disabled={!selectedObjectName}
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
            <div
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              className={cn(
                "mx-4 mb-3 cursor-pointer rounded-2xl border border-divider-main p-3",
                // isActive ? "bg-dark-alpha/80" : "bg-dark-alpha/40",
              )}
            >
              <div className="mb-2 text-sm font-normal">
                {chapter.title || "Untitled Chapter"}
              </div>

              {isActive && (
                <>
                  <ChapterIdentitySection
                    chapter={chapter}
                    panelSectionStyle={panelSectionStyle}
                    inputStyle={inputStyle}
                    setActiveChapterId={setActiveChapterId}
                    updateChapterField={updateChapterField}
                  />

                  <ChapterDescriptionSection
                    chapter={chapter}
                    panelSectionStyle={panelSectionStyle}
                    inputStyle={inputStyle}
                    updateChapterField={updateChapterField}
                  />

                  <ChapterParameterSection
                    chapter={chapter}
                    panelSectionStyle={panelSectionStyle}
                    inputStyle={inputStyle}
                    addChapterParameter={addChapterParameter}
                    updateChapterParameter={updateChapterParameter}
                    deleteChapterParameter={deleteChapterParameter}
                  />

                  <ChapterMarkerSection
                    chapter={chapter}
                    markerMode={markerMode}
                    requestAddMarker={requestAddMarker}
                    cancelAddMarker={cancelAddMarker}
                    deleteMarkerFromActiveChapter={
                      deleteMarkerFromActiveChapter
                    }
                  />

                  <ChapterCameraSection
                    panelSectionStyle={panelSectionStyle}
                    saveCameraViewToActiveChapter={
                      saveCameraViewToActiveChapter
                    }
                  />

                  <ChapterAnimationSection
                    chapter={chapter}
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
                    chapter={chapter}
                    panelSectionStyle={panelSectionStyle}
                    mediaButtonStyle={mediaButtonStyle}
                    addChapterMedia={addChapterMedia}
                    deleteChapterMedia={deleteChapterMedia}
                  />

                  <ChapterDeselectButton
                    setActiveChapterId={setActiveChapterId}
                  />
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
