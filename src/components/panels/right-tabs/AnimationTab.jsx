export default function AnimationTab(props) {
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
                          Animasi Advance
                        </div>

                        {animations.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#9ca3af",
                            }}
                          >
                            Tidak ada animasi pada model ini
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <button
                                onClick={() => {
                                  const next = {}

                                  animations.forEach((anim) => {
                                    next[anim.name] = {
                                      ...(selectedAnimations[anim.name] || {}),
                                      selected: true,
                                    }
                                  })

                                  setSelectedAnimations(next)
                                }}
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#374151",
                                  color: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Select All
                              </button>

                              <button
                                onClick={() => {
                                  const next = {}

                                  animations.forEach((anim) => {
                                    next[anim.name] = {
                                      ...(selectedAnimations[anim.name] || {}),
                                      selected: false,
                                    }
                                  })

                                  setSelectedAnimations(next)
                                }}
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#374151",
                                  color: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Clear
                              </button>
                            </div>

                            <div
                              style={{
                                maxHeight: 180,
                                overflowY: "auto",
                                border: "1px solid #374151",
                                borderRadius: 8,
                                marginBottom: 8,
                              }}
                            >
                              {animations.map((anim) => {
                                const config = selectedAnimations[anim.name] || {
                                  selected: false,
                                  loop: false,
                                }

                                return (
                                  <div
                                    key={anim.name}
                                    style={{
                                      padding: 8,
                                      borderBottom: "1px solid #374151",
                                      display: "grid",
                                      gridTemplateColumns: "24px 1fr 60px",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={config.selected}
                                      onChange={(e) => {
                                        setSelectedAnimations((prev) => ({
                                          ...prev,
                                          [anim.name]: {
                                            ...(prev[anim.name] || {}),
                                            selected: e.target.checked,
                                          },
                                        }))
                                      }}
                                    />

                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: "bold" }}>
                                        {anim.name}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                                        {anim.duration?.toFixed?.(2) || 0}s
                                      </div>
                                    </div>

                                    <label
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: 11,
                                        color: "#d1d5db",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={config.loop}
                                        onChange={(e) => {
                                          setSelectedAnimations((prev) => ({
                                            ...prev,
                                            [anim.name]: {
                                              ...(prev[anim.name] || {}),
                                              loop: e.target.checked,
                                            },
                                          }))
                                        }}
                                      />
                                      Loop
                                    </label>
                                  </div>
                                )
                              })}
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => {
                                  setAnimationCommand(null)

                                  setTimeout(() => {
                                    setAnimationCommand({
                                      type: "play",
                                      id: crypto.randomUUID(),
                                    })
                                  }, 10)
                                }}
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#2563eb",
                                  color: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Play Selected
                              </button>

                              <button
                                onClick={() => {
                                  setAnimationCommand({
                                    type: "stop",
                                    id: crypto.randomUUID(),
                                  })
                                }}
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#dc2626",
                                  color: "white",
                                  cursor: "pointer",
                                }}
                              >
                                Stop
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                        </>
  )
}
