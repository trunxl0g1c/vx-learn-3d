import Button from "../../ui/button";

export default function MaterialTab(props) {
  const {
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
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
  } = props;

  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="bg-dark-alpha p-3 rounded-2xl mb-2 text-bsae">
        Object dipilih:
        <br />
        <strong>{selectedObjectName || "-"}</strong>
      </div>

      <div className="flex flex-col gap-3">
        <Button size="sm" onClick={createChapterFromSelectedObject}>
          Buat Bab dari Object
        </Button>

        <Button size="sm" onClick={saveCameraViewToActiveChapter}>
          Save Camera View
        </Button>

        <Button size="sm" onClick={saveMaterial}>
          Save Material JSON
        </Button>
      </div>
    </div>
  );
}
