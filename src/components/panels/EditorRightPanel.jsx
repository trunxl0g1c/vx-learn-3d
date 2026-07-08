import { useState } from "react";
import { Eye, Locate, LocateFixed, Minus, Plus } from "lucide-react";
import MaterialTab from "./right-tabs/MaterialTab";
import VisualTab from "./right-tabs/VisualTab";
import AnimationTab from "./right-tabs/AnimationTab";
import ChapterTab from "./right-tabs/ChapterTab";
import Button from "../ui/button";
import InfoTab from "./right-tabs/InfoTab";

export default function EditorRightPanel({
  rightTab,
  setRightTab,
  selectedObjectName,
  createChapterFromSelectedObject,
  saveCameraViewToActiveChapter,
  saveMaterial,
  isSavingPackage,
  savePackageProgress,
  savePackageStatus,
  applyShaderMode,
  shaderMode,
  metalness,
  setMetalness,
  roughness,
  setRoughness,
  viewerSettings,
  setViewerSettings,
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
  playAnimationPreview,
  stopAnimationPreview,
  addChapterMedia,
  deleteChapterMedia,
  setMarkerMode,
  requestAddMarker,
  markerMode,
  cancelAddMarker,

  hideSelectedObject,
  soloSelectedObject,
  resetAllTransforms,
  deselectObject,
}) {
  const [isOpen, setIsOpen] = useState(true);

  const isInfoTab = rightTab === "info";
  const isPackageTab = rightTab === "material";
  const isFitHeight = isInfoTab || isPackageTab || markerMode;

  const tabProps = {
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
    isSavingPackage,
    savePackageProgress,
    savePackageStatus,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
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
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    setMarkerMode,
    requestAddMarker,
    markerMode,
    cancelAddMarker,
    setRightTab,
    deselectObject,
  };

  return (
    <aside
      className={[
        "absolute right-0 top-14 z-[120] flex w-[500px] flex-col overflow-hidden",
        "border border-divider-main text-white transition-all duration-200",
        "bg-primary/75 backdrop-blur-sm backdrop-saturate-200",
        isOpen
          ? isFitHeight
            ? "h-fit max-h-[calc(100vh-3.5rem)] rounded-b-3xl"
            : "bottom-0"
          : "h-16",
      ].join(" ")}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-divider-main bg-dark-alpha/80 px-5 text-left backdrop-blur-xl">
        <span className="truncate text-base font-normal">
          {selectedObjectName || "Object Settings"}
        </span>

        <div className="flex">
          {/* <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => setRightTab("chapter")}
            className="border-none"
          >
            {rightTab === "chapter" ? (
              <Locate className="size-6 text-secondary-default" />
            ) : (
              <LocateFixed className="size-6 text-secondary-default" />
            )}
          </Button> */}

          <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={soloSelectedObject}
            className="border-none"
          >
            {rightTab === "chapter" ? (
              <Locate className="size-6 text-secondary-default" />
            ) : (
              <LocateFixed className="size-6 text-secondary-default" />
            )}
          </Button>

          {/* <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => setRightTab("info")}
            className="border-none"
          >
            <Eye className="size-6 text-secondary-default" />
          </Button> */}
          
          <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={hideSelectedObject}
            className="border-none"
          >
            <Eye className="size-6 text-secondary-default" />
          </Button>

          <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="border-none"
          >
            {isOpen ? (
              <Minus className="size-6 text-secondary-default" />
            ) : (
              <Plus className="size-6 text-secondary-default" />
            )}
          </Button>
        </div>
      </div>

      {isOpen && !isInfoTab && !markerMode && (
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
      )}

      {isOpen && (
        <div
          className={[
            "sidebar-scroll bg-primary/50 backdrop-blur-xl",
            isFitHeight
              ? "max-h-[calc(100vh-7.5rem)] overflow-y-auto"
              : "min-h-0 flex-1 overflow-y-auto",
          ].join(" ")}
        >
          {/* {rightTab === "material" && <MaterialTab {...tabProps} />} */}
          {rightTab === "visual" && <VisualTab {...tabProps} />}
          {rightTab === "animation" && <AnimationTab {...tabProps} />}
          {rightTab === "chapter" && <ChapterTab {...tabProps} />}
          {rightTab === "info" && <InfoTab {...tabProps} />}
        </div>
      )}
    </aside>
  );
}
