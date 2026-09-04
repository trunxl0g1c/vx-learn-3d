import ChapterIdentitySection from "../chapter/ChapterIdentitySection";
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection";
import ChapterParameterSection from "../chapter/ChapterParameterSection";
import ChapterDeselectButton from "../chapter/ChapterDeselectButton";
import ChapterDeleteButton from "../chapter/ChapterDeleteButton";
import InlineAlert from "../../ui/inline-alert";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";

export default function ChapterTab({
  chapterFeedback,
  clearChapterFeedback,
  material,
  activeChapterId,
  setActiveChapterId,
  selectedObjectName,
  updateChapterField,
  addChapterParameter,
  updateChapterParameter,
  deleteChapterParameter,
  deleteChapterContent,
  setRightTab,
  deselectObject,
}) {
  const chapters = material?.chapters || [];
  const activeChapter = chapters.find(
    (chapter) => chapter.id === activeChapterId,
  );
  const isLoadingActiveChapter = isLazyMaterialRecord(
    activeChapter,
    "chapters",
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {!activeChapter ? (
          <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-grayout-main">
            Select an object and choose Create Description Object.
          </div>
        ) : isLoadingActiveChapter ? (
          <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-grayout-main">
            Loading object description...
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
              setActiveChapterId={setActiveChapterId}
              updateChapterField={updateChapterField}
            />

            <ChapterDescriptionSection
              chapter={activeChapter}
              updateChapterField={updateChapterField}
            />

            <ChapterParameterSection
              chapter={activeChapter}
              addChapterParameter={addChapterParameter}
              updateChapterParameter={updateChapterParameter}
              deleteChapterParameter={deleteChapterParameter}
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
            contentType="description"
          />
        </div>
      )}
    </div>
  );
}
