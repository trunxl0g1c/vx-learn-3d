import { useState } from "react";
import MaterialTab from "./right-tabs/MaterialTab";
import VisualTab from "./right-tabs/VisualTab";
import AnimationTab from "./right-tabs/AnimationTab";
import ChapterTab from "./right-tabs/ChapterTab";
import SlideTab from "./slide/SlideTab";
import Button from "../ui/button";
import InfoTab from "./right-tabs/InfoTab";
import MaterialIcon from "../ui/material-icon";
import {
  EDITOR_RIGHT_PANEL_WIDTH,
  EDITOR_TOP_BAR_HEIGHT,
} from "../../constants/editorLayout";

export default function EditorRightPanel({
  chapterFeedback,
  clearChapterFeedback,
  rightTab,
  setRightTab,
  selectedObject,
  selectedObjectName,
  authoringObjectName,
  createChapterFromSelectedObject,
  previewChapterInEditor,
  contentAuthoringLocked = false,
  contentAuthoringLockReason = "",
  saveCameraViewToActiveChapter,
  applyShaderMode,
  shaderMode,
  metalness,
  setMetalness,
  roughness,
  setRoughness,
  viewerSettings,
  setViewerSettings,
  modelScene,
  updateEnvIntensity,
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
  animations,
  selectedAnimations,
  setSelectedAnimations,
  setAnimationCommand,
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
  setMarkerMode,
  requestAddMarker,
  markerMode,
  cancelAddMarker,

  hideSelectedObject,
  soloSelectedObject,
  toggleSelectedObjectXray,
  isSelectedObjectXray,
  resetAllTransforms,
  deselectObject,
  deleteCameraViewFromActiveChapter,
  slideAuthoring,
  requestAddSlideMarker,
  leftPanelOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(true);

  const isInfoTab = rightTab === "info";
  const isPackageTab = rightTab === "material";
  const isSlideTab = rightTab === "slide";
  const isFitHeight = isInfoTab || isPackageTab || markerMode;
  const shouldHideObjectContentPanel = contentAuthoringLocked && isInfoTab;

  const tabProps = {
    chapterFeedback,
    clearChapterFeedback,
    selectedObject,
    selectedObjectName,
    createChapterFromSelectedObject,
    previewChapterInEditor,
    contentAuthoringLocked,
    contentAuthoringLockReason,
    saveCameraViewToActiveChapter,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    modelScene,
    updateEnvIntensity,
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
    animations,
    selectedAnimations,
    setSelectedAnimations,
    setAnimationCommand,
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
    setMarkerMode,
    requestAddMarker,
    markerMode,
    cancelAddMarker,
    setRightTab,
    deselectObject,
    deleteCameraViewFromActiveChapter,
  };

  if (shouldHideObjectContentPanel) return null;

  return (
    <aside
      style={{
        top: EDITOR_TOP_BAR_HEIGHT,
        width: EDITOR_RIGHT_PANEL_WIDTH,
      }}
      className={[
        "vx-editor-right-panel absolute right-0 z-[120] flex flex-col overflow-hidden",
        leftPanelOpen ? "vx-editor-right-panel--behind-left" : "",
        "border border-divider-main text-white transition-all duration-200",
        "bg-primary/75 backdrop-blur-sm backdrop-saturate-200",
        isOpen
          ? isFitHeight
            ? "h-fit max-h-[calc(100vh-3.5rem)] rounded-b-3xl"
            : "bottom-0"
          : "h-16",
      ].join(" ")}
    >
      <div className="flex h-16 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-divider-main bg-dark-alpha/80 px-3 text-left backdrop-blur-xl sm:px-4 xl:px-5">
        <span className="min-w-0 flex-1 truncate text-sm font-normal sm:text-base">
          {isSlideTab
            ? slideAuthoring?.activeSlide?.title || "Slide"
            : activeChapterId
              ? authoringObjectName || "Object Description"
              : selectedObjectName || "Object Settings"}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => setRightTab("chapter")}
            className="h-9! w-9! shrink-0 border-none p-0!"
          >
            {rightTab === "chapter" ? (
              <Locate className="size-6 text-secondary-default" />
            ) : (
              <LocateFixed className="size-6 text-secondary-default" />
            )}
          </Button> */}

          {!isSlideTab && (
            <>
              <Button
                size="xs"
                variant="ghost"
                type="button"
                onClick={soloSelectedObject}
                className="h-9! w-9! shrink-0 border-none p-0!"
              >
                <MaterialIcon
                  name="my_location"
                  fill={1}
                  size={25}
                  className="text-secondary-default"
                />
              </Button>

              <Button
                size="xs"
                variant="ghost"
                type="button"
                onClick={toggleSelectedObjectXray}
                className={[
                  "h-9! w-9! shrink-0 border-none p-0!",
                  isSelectedObjectXray ? "bg-accent-main/25" : "",
                ].join(" ")}
                title={
                  isSelectedObjectXray ? "Reset X-Ray" : "X-Ray Selected"
                }
                aria-pressed={isSelectedObjectXray}
              >
                <MaterialIcon
                  name="blur_on"
                  fill={isSelectedObjectXray ? 1 : 0}
                  size={25}
                  className={
                    isSelectedObjectXray
                      ? "text-accent-contrast"
                      : "text-secondary-default"
                  }
                />
              </Button>

              <Button
                size="xs"
                variant="ghost"
                type="button"
                onClick={hideSelectedObject}
                className="h-9! w-9! shrink-0 border-none p-0!"
              >
                <MaterialIcon
                  name="visibility"
                  fill={1}
                  size={25}
                  className="text-secondary-default"
                />
              </Button>
            </>
          )}

          <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-9! w-9! shrink-0 border-none p-0!"
          >
            {isOpen ? (
              <MaterialIcon
                name="remove"
                fill={1}
                size={25}
                className="text-secondary-default"
              />
            ) : (
              <MaterialIcon
                name="add_2"
                fill={1}
                size={25}
                className="text-secondary-default"
              />
            )}
          </Button>
        </div>
      </div>

      {/* {isOpen && !isInfoTab && !markerMode && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-b border-divider-main bg-primary/40 py-3 backdrop-blur-xl">
          {[
            // ["material", "Package"],
            ["chapter", "Chapter"],
            ["animation", "Animation"],
          ].map(([id, label]) => (
            <Button
              key={id}
              onClick={() => setRightTab(id)}
              variant={rightTab === id ? "default" : "outline"}
              className="w-32!"
              size="sm"
            >
              {label}
            </Button>
          ))}
        </div>
      )} */}

      {isOpen && (
        <div
          className={[
            "sidebar-scroll bg-primary/50 backdrop-blur-xl",
            isFitHeight
              ? "max-h-[calc(100vh-7.5rem)] overflow-y-auto"
              : "min-h-0 flex-1 overflow-y-auto",
          ].join(" ")}
        >
          {rightTab === "material" && <MaterialTab {...tabProps} />}
          {rightTab === "visual" && <VisualTab {...tabProps} />}
          {rightTab === "animation" && <AnimationTab {...tabProps} />}
          {rightTab === "chapter" && (
            <ChapterTab {...tabProps} />
          )}
          {rightTab === "slide" && (
            <SlideTab
              slideAuthoring={slideAuthoring}
              material={material}
              animations={animations}
              markerMode={markerMode}
              requestAddSlideMarker={requestAddSlideMarker}
              cancelAddMarker={cancelAddMarker}
            />
          )}
          {rightTab === "info" && <InfoTab {...tabProps} />}
        </div>
      )}
    </aside>
  );
}
