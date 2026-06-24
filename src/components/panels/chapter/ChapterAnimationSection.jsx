export default function ChapterAnimationSection({
  chapter,
  panelSectionStyle,
  animations,
  isChapterAnimationSelected,
  getChapterAnimationConfig,
  toggleChapterAnimation,
  updateChapterAnimationField,
  playAnimationPreview,
  stopAnimationPreview,
}) {
  return (
    <div style={panelSectionStyle}>
      <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
        Animation
      </div>

      {animations.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
          Tidak ada animasi yang terdeteksi pada file GLB ini.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
            Pilih animasi dari GLB untuk disimpan pada bab ini.
          </div>

          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            {animations.map((anim) => {
              const selected = isChapterAnimationSelected(chapter, anim.name)
              const config = getChapterAnimationConfig(chapter, anim.name)

              return (
                <div
                  key={anim.name}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: 8,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 64px 72px",
                    gap: 8,
                    alignItems: "center",
                    background: selected ? "rgba(37,99,235,0.28)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) =>
                      toggleChapterAnimation(chapter.id, anim.name, e.target.checked)
                    }
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
                      gap: 4,
                      alignItems: "center",
                      fontSize: 11,
                      color: selected ? "white" : "#9ca3af",
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={!selected}
                      checked={config.loop || false}
                      onChange={(e) =>
                        updateChapterAnimationField(
                          chapter.id,
                          anim.name,
                          "loop",
                          e.target.checked
                        )
                      }
                    />
                    Loop
                  </label>

                  <label
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      fontSize: 11,
                      color: selected ? "white" : "#9ca3af",
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={!selected}
                      checked={config.autoPlay || false}
                      onChange={(e) =>
                        updateChapterAnimationField(
                          chapter.id,
                          anim.name,
                          "autoPlay",
                          e.target.checked
                        )
                      }
                    />
                    Auto
                  </label>
                </div>
              )
            })}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                playAnimationPreview(chapter)
              }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ▶ Preview
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                stopAnimationPreview()
              }}
              style={{
                flex: 1,
                padding: 8,
                borderRadius: 8,
                border: "none",
                background: "#dc2626",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Stop
            </button>
          </div>
        </>
      )}
    </div>
  )
}
