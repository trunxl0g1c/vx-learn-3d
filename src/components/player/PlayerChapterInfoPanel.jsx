export default function PlayerChapterInfoPanel({
  activeChapter,
  speakChapterDescription,
  stopSpeaking,
  playChapterAnimations,
  stopChapterAnimations,
}) {
  if (!activeChapter) return null

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        right: 20,
        top: 84,
        bottom: 20,
        width: 360,
        overflowY: "auto",
        background: "rgba(15, 23, 42, 0.95)",
        color: "white",
        padding: 20,
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        zIndex: 110,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#93c5fd",
          marginBottom: 8,
          fontWeight: "bold",
        }}
      >
        Chapter Info
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Object
      </div>

      <div style={{ fontWeight: "bold", marginBottom: 14 }}>
        {activeChapter.objectName}
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 10 }}>
        {activeChapter.title}
      </h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button
          onClick={speakChapterDescription}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ▶ Play Voice
        </button>

        <button
          onClick={stopSpeaking}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#374151",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Stop
        </button>
      </div>

      <p
        style={{
          color: "#e5e7eb",
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {activeChapter.description || "Belum ada deskripsi."}
      </p>

      {activeChapter?.parameters?.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            Parameters
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {activeChapter.parameters.map((parameter, index) => {
              const label =
                parameter.name || parameter.label || `Parameter ${index + 1}`

              const value = parameter.value || "-"
              const unit = parameter.unit || ""

              return (
                <div
                  key={parameter.id || `${label}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#cbd5e1" }}>{label}</span>

                  <strong style={{ color: "white", textAlign: "right" }}>
                    {value}
                    {unit ? ` ${unit}` : ""}
                  </strong>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeChapter?.animations?.length > 0 && (
        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            Animation
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {activeChapter.animations.map((animation, index) => {
              const name =
                typeof animation === "string"
                  ? animation
                  : animation?.name || `Animation ${index + 1}`

              const loop =
                typeof animation === "string" ? false : Boolean(animation?.loop)

              return (
                <div
                  key={`${name}-${index}`}
                  style={{
                    padding: 9,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13,
                  }}
                >
                  <strong>{name}</strong>
                  {loop && (
                    <span style={{ color: "#86efac", marginLeft: 6 }}>
                      Loop
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={playChapterAnimations}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ▶ Play Animation
            </button>

            <button
              onClick={stopChapterAnimations}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#374151",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
