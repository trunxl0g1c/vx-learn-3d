export default function VisualTab(props) {
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
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    Visual Shader
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {[
                      ["original", "Original"],
                      ["enhanced", "Enhanced"],
                      ["toon", "Toon"],
                      ["wireframe", "Wire"],
                      ["xray", "X-Ray"],
                      ["clay", "Clay"],
                    ].map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => applyShaderMode(mode)}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          background:
                            shaderMode === mode ? "#2563eb" : "#374151",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    Metalness: {metalness}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={metalness}
                    onChange={(e) => setMetalness(Number(e.target.value))}
                    style={{ width: "100%", marginBottom: 10 }}
                  />

                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    Roughness: {roughness}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={roughness}
                    onChange={(e) => setRoughness(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />

                  <div style={{ marginTop: 12, fontWeight: "bold", fontSize: 13 }}>
                    Lighting
                  </div>

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Exposure: {viewerSettings.exposure}
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={viewerSettings.exposure}
                    onChange={(e) => {
                      const value = Number(e.target.value)

                      setViewerSettings((prev) => ({
                        ...prev,
                        exposure: value,
                      }))

                      if (window.__EDITOR_RENDERER__) {
                        window.__EDITOR_RENDERER__.toneMappingExposure = value
                      }
                    }}
                    style={{ width: "100%" }}
                  />

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Ambient Light: {viewerSettings.ambientLight}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={viewerSettings.ambientLight}
                    onChange={(e) =>
                      setViewerSettings((prev) => ({
                        ...prev,
                        ambientLight: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%" }}
                  />

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Main Light: {viewerSettings.mainLight}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.1"
                    value={viewerSettings.mainLight}
                    onChange={(e) =>
                      setViewerSettings((prev) => ({
                        ...prev,
                        mainLight: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%" }}
                  />

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Fill Light: {viewerSettings.fillLight}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={viewerSettings.fillLight}
                    onChange={(e) =>
                      setViewerSettings((prev) => ({
                        ...prev,
                        fillLight: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%" }}
                  />

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Hemisphere Light: {viewerSettings.hemiLight}
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={viewerSettings.hemiLight}
                    onChange={(e) =>
                      setViewerSettings((prev) => ({
                        ...prev,
                        hemiLight: Number(e.target.value),
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    Environment Intensity: {viewerSettings.envIntensity}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.1"
                    value={viewerSettings.envIntensity}
                    onChange={(e) =>
                      updateEnvIntensity(Number(e.target.value))
                    }
                    style={{ width: "100%" }}
                  />

                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    HDRI
                  </div>

                  <select
                    value={viewerSettings.hdri}
                    onChange={(e) =>
                      setViewerSettings((prev) => ({
                        ...prev,
                        hdri: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      background: "#111827",
                      color: "white",
                      border: "1px solid #374151",
                    }}
                  >
                    <option value="">None</option>
                    <option value="/hdr/studio.hdr">Studio</option>
                    <option value="/hdr/warehouse.hdr">Warehouse</option>
                    <option value="/hdr/sunset.hdr">Sunset</option>
                    <option value="/hdr/hangar.hdr">Hangar</option>
                    <option value="/hdr/industrial.hdr">Industrial</option>
                    <option value="/hdr/emptyhangar.hdr">Empty Hangar</option>
                    <option value="/hdr/capehill.hdr">Cape Hill</option>
                  </select>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={viewerSettings.showHdriBackground}
                      onChange={(e) =>
                        setViewerSettings((prev) => ({
                          ...prev,
                          showHdriBackground: e.target.checked,
                        }))
                      }
                    />

                    <span>Show HDRI Background</span>
                  </div>

                </div>
                  </>
  )
}
