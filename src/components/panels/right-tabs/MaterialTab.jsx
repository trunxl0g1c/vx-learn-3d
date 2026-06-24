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
  } = props

  return (
                <>
             

                <div
                    style={{
                    background: "#1f2937",
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    }}
                >
                    Object dipilih:
                    <br />
                    <strong>{selectedObjectName || "-"}</strong>
                </div>

                <button
                    onClick={createChapterFromSelectedObject}
                    style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginBottom: 8,
                    }}
                >
                    Buat Bab dari Object
                </button>

                <button
                  onClick={saveCameraViewToActiveChapter}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                    background: "#7c3aed",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginBottom: 8,
                  }}
                >
                  Save Camera View
                </button>

                <button
                    onClick={saveMaterial}
                    style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                    background: "#059669",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginBottom: 16,
                    }}
                >
                    Save Material JSON
                </button>

                 </>
  )
}
