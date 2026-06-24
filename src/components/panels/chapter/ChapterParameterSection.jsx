export default function ChapterParameterSection({
  chapter,
  panelSectionStyle,
  inputStyle,
  addChapterParameter,
  updateChapterParameter,
  deleteChapterParameter,
}) {
  return (
    <div style={panelSectionStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 13 }}>Parameter</div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            addChapterParameter(chapter.id)
          }}
          style={{
            padding: "6px 8px",
            borderRadius: 7,
            border: "none",
            background: "#0e7490",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          + Add
        </button>
      </div>

      {(chapter.parameters || []).length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 12 }}>
          No parameter has not been added yet
        </div>
      ) : (
        (chapter.parameters || []).map((parameter) => (
          <div
            key={parameter.id}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 52px 28px",
              gap: 6,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              value={parameter.name || ""}
              onChange={(e) =>
                updateChapterParameter(chapter.id, parameter.id, "name", e.target.value)
              }
              placeholder="Name"
              style={{ ...inputStyle, padding: 7 }}
            />
            <input
              value={parameter.value || ""}
              onChange={(e) =>
                updateChapterParameter(chapter.id, parameter.id, "value", e.target.value)
              }
              placeholder="Value"
              style={{ ...inputStyle, padding: 7 }}
            />
            <input
              value={parameter.unit || ""}
              onChange={(e) =>
                updateChapterParameter(chapter.id, parameter.id, "unit", e.target.value)
              }
              placeholder="Unit"
              style={{ ...inputStyle, padding: 7 }}
            />
            <button
              onClick={() => deleteChapterParameter(chapter.id, parameter.id)}
              style={{
                height: 32,
                borderRadius: 7,
                border: "none",
                background: "#7f1d1d",
                color: "white",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  )
}
