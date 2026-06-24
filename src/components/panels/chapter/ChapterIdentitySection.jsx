export default function ChapterIdentitySection({
  chapter,
  panelSectionStyle,
  inputStyle,
  setActiveChapterId,
  updateChapterField,
}) {
  return (
    <div style={panelSectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 13 }}>
          {chapter.objectName || "Object"}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setActiveChapterId(null)
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "#67e8f9",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          −
        </button>
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
        Alias Name
      </div>

      <input
        value={chapter.title || ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => updateChapterField(chapter.id, "title", e.target.value)}
        maxLength={48}
        placeholder="Alias name"
        style={inputStyle}
      />

      <div
        style={{
          textAlign: "right",
          fontSize: 10,
          color: "#9ca3af",
          marginTop: 4,
        }}
      >
        {(chapter.title || "").length}/48
      </div>
    </div>
  )
}
