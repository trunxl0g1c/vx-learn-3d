import ChapterIdentitySection from "../chapter/ChapterIdentitySection";
import ChapterDescriptionSection from "../chapter/ChapterDescriptionSection";
import ChapterParameterSection from "../chapter/ChapterParameterSection";
import ChapterMarkerSection from "../chapter/ChapterMarkerSection";
import ChapterCameraSection from "../chapter/ChapterCameraSection";
import ChapterAnimationSection from "../chapter/ChapterAnimationSection";
import ChapterFlowSection from "../chapter/ChapterFlowSection";
import ChapterMediaSection from "../chapter/ChapterMediaSection";
import ChapterDeleteButton from "../chapter/ChapterDeleteButton";
import InlineAlert from "../../ui/inline-alert";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";

function SlideCloseButton({ onClose }) {
  return (
    <div className="shrink-0 border-t border-grayout-dark bg-primary p-4 backdrop-blur-3xl">
      <button
        type="button"
        onClick={onClose}
        className="w-full cursor-pointer rounded-2xl bg-accent-contrast p-3 uppercase text-white"
      >
        Close Slide
      </button>
    </div>
  );
}

export default function SlideTab({
  slideAuthoring,
  material,
  animations = [],
  markerMode = false,
  requestAddSlideMarker,
  cancelAddMarker,
}) {
  const slide = slideAuthoring?.activeSlide || null;
  const loading = isLazyMaterialRecord(slide, "slides");

  if (!slide) {
    return (
      <div className="grid min-h-[220px] place-items-center p-6 text-center text-sm text-contrast-grayout">
        Pilih slide dari Slide List atau buat Create New Slide.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-grayout-main">
          Loading slide content...
        </div>
      </div>
    );
  }

  if (markerMode) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
          <ChapterMarkerSection
            chapter={slide}
            markerMode={markerMode}
            requestAddMarker={requestAddSlideMarker}
            cancelAddMarker={cancelAddMarker}
            deleteMarkerFromActiveChapter={slideAuthoring?.deleteMarker}
          />
        </div>
        <SlideCloseButton onClose={slideAuthoring?.closeSlide} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-3">
        <div className="px-4">
          <InlineAlert
            type={slideAuthoring?.feedback?.type || "error"}
            message={slideAuthoring?.feedback?.message}
            duration={3000}
            onClose={slideAuthoring?.clearFeedback}
          />
        </div>

        <ChapterIdentitySection
          chapter={slide}
          updateChapterField={slideAuthoring?.updateSlideField}
        />
        <ChapterDescriptionSection
          chapter={slide}
          updateChapterField={slideAuthoring?.updateSlideField}
        />
        <ChapterParameterSection
          chapter={slide}
          addChapterParameter={slideAuthoring?.addParameter}
          updateChapterParameter={slideAuthoring?.updateParameter}
          deleteChapterParameter={slideAuthoring?.deleteParameter}
        />
        <ChapterMarkerSection
          chapter={slide}
          markerMode={markerMode}
          requestAddMarker={requestAddSlideMarker}
          cancelAddMarker={cancelAddMarker}
          deleteMarkerFromActiveChapter={slideAuthoring?.deleteMarker}
        />
        <ChapterCameraSection
          chapter={slide}
          saveCameraViewToActiveChapter={slideAuthoring?.saveCameraView}
          deleteCameraViewFromActiveChapter={slideAuthoring?.deleteCameraView}
          previewChapterInEditor={slideAuthoring?.previewSlide}
          updateChapterField={slideAuthoring?.updateSlideField}
        />
        <ChapterAnimationSection
          chapter={slide}
          animations={animations}
          authoredAnimations={material?.authoredAnimations || []}
          addChapterAnimation={slideAuthoring?.addAnimation}
          updateChapterAnimation={slideAuthoring?.updateAnimation}
          removeChapterAnimation={slideAuthoring?.removeAnimation}
        />
        <ChapterFlowSection
          chapter={slide}
          flows={material?.flows || []}
          addChapterFlow={slideAuthoring?.addFlow}
          updateChapterFlow={slideAuthoring?.updateFlow}
          removeChapterFlow={slideAuthoring?.removeFlow}
        />
        <ChapterMediaSection
          chapter={slide}
          addChapterMedia={slideAuthoring?.addMedia}
          deleteChapterMedia={slideAuthoring?.deleteMedia}
        />
      </div>

      <div className="shrink-0">
        <SlideCloseButton onClose={slideAuthoring?.closeSlide} />
        <ChapterDeleteButton
          chapter={slide}
          onDelete={slideAuthoring?.deleteSlide}
        />
      </div>
    </div>
  );
}
