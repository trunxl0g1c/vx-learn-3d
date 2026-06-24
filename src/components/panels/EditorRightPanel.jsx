import MaterialTab from "./right-tabs/MaterialTab"
import VisualTab from "./right-tabs/VisualTab"
import AnimationTab from "./right-tabs/AnimationTab"
import ChapterTab from "./right-tabs/ChapterTab"

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
  deleteChapterMedia
}) {
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
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 20,
        top: 84,
        bottom: 20,
        width: 360,
        zIndex: 110,
        background: "rgba(15,23,42,0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "white",
        padding: 16,
        overflowY: "auto",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        boxShadow: "0 16px 48px rgba(0,0,0,0.34)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {[
          ["material", "Materi"],
          ["animation", "Animasi"],
          ["chapter", "Bab"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setRightTab(id)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              background: rightTab === id ? "#2563eb" : "#374151",
              color: "white",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {rightTab === "material" && <MaterialTab {...tabProps} />}
      {rightTab === "visual" && <VisualTab {...tabProps} />}
      {rightTab === "animation" && <AnimationTab {...tabProps} />}
      {rightTab === "chapter" && <ChapterTab {...tabProps} />}
    </div>
  )
}
