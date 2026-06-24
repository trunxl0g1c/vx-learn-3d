import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import MaterialTab from "./right-tabs/MaterialTab";
import VisualTab from "./right-tabs/VisualTab";
import AnimationTab from "./right-tabs/AnimationTab";
import ChapterTab from "./right-tabs/ChapterTab";
import Button from "../ui/button";

export default function EditorRightPanel({
  rightTab,
  setRightTab,
  selectedObjectName,
  createChapterFromSelectedObject,
  saveCameraViewToActiveChapter,
  saveMaterial,
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
}) {
  const [isOpen, setIsOpen] = useState(true);

  const tabProps = {
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
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
  };

  return (
    <aside
      className={[
        "absolute right-0 top-16 z-[120] flex w-[500px] flex-col overflow-hidden",
        "border border-divider-main bg-primary text-white transition-all duration-200",
        isOpen ? "bottom-0" : "h-16",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-16 shrink-0 cursor-pointer items-center justify-between bg-dark-alpha px-5 text-left transition hover:bg-white/5"
      >
        <span className="truncate text-base font-semibold">
          {selectedObjectName || "Object Settings"}
        </span>

        {isOpen ? (
          <Minus className="size-5 text-secondary-default" />
        ) : (
          <Plus className="size-5 text-secondary-default" />
        )}
      </button>

      {isOpen && (
        <>
          <div className="flex shrink-0 items-center justify-center gap-3 py-3">
            {[
              ["material", "Materi"],
              ["animation", "Animasi"],
              ["chapter", "Bab"],
            ].map(([id, label]) => (
              <Button
                key={id}
                onClick={() => setRightTab(id)}
                variant={rightTab === id ? "default" : "outline"}
                className="w-32!"
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto bg-primary">
            {rightTab === "material" && <MaterialTab {...tabProps} />}
            {rightTab === "visual" && <VisualTab {...tabProps} />}
            {rightTab === "animation" && <AnimationTab {...tabProps} />}
            {rightTab === "chapter" && <ChapterTab {...tabProps} />}
          </div>
        </>
      )}
    </aside>
  );
}
