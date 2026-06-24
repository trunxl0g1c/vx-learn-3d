import ChapterEmptyState from "../chapter/ChapterEmptyState"
import ChapterCardHeader from "../chapter/ChapterCardHeader"
import ChapterIdentitySection from "../chapter/ChapterIdentitySection"
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection"
import ChapterParameterSection from "../chapter/ChapterParameterSection"
import ChapterMarkerSection from "../chapter/ChapterMarkerSection"
import ChapterCameraSection from "../chapter/ChapterCameraSection"
import ChapterAnimationSection from "../chapter/ChapterAnimationSection"
import ChapterMediaSection from "../chapter/ChapterMediaSection"
import ChapterDeselectButton from "../chapter/ChapterDeselectButton"

export default function ChapterTab(props) {
  const {
    material,
    activeChapterId,
    setActiveChapterId,
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
  } = props

  return (
    <>
      <div
        style={{
          fontWeight: "bold",
          fontSize: 16,
          marginBottom: 14,
          color: "#d8b4fe",
          borderBottom: "1px dashed rgba(168,85,247,0.45)",
          paddingBottom: 10,
        }}
      >
        ❖ Object Panel
      </div>

      {material.chapters.length === 0 ? (
        <ChapterEmptyState />
      ) : (
        material.chapters.map((chapter, index) => {
          const isActive = activeChapterId === chapter.id

          return (
            <div
              key={chapter.id}
              onClick={() => setActiveChapterId(chapter.id)}
              style={{
                padding: isActive ? 12 : 10,
                borderRadius: 12,
                marginBottom: 12,
                background: isActive
                  ? "rgba(15,23,42,0.92)"
                  : "rgba(31,41,55,0.92)",
                border: isActive
                  ? "1px solid rgba(56,189,248,0.35)"
                  : "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
            >
              <ChapterCardHeader chapter={chapter} index={index} isActive={isActive} />

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
                    panelSectionStyle={panelSectionStyle}
                    deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
                  />

                  <ChapterCameraSection
                    panelSectionStyle={panelSectionStyle}
                    saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
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

                  <ChapterDeselectButton setActiveChapterId={setActiveChapterId} />
                </>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
