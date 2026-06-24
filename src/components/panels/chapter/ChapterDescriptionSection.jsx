export default function ChapterDescriptionSection({
  chapter,
  panelSectionStyle,
  inputStyle,
  updateChapterField,
}) {
  return (
    <div style={panelSectionStyle}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
        Description
      </div>

      <textarea
        value={chapter.description || ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) =>
          updateChapterField(chapter.id, "description", e.target.value)
        }
        maxLength={850}
        placeholder="Isi deskripsi materi..."
        style={{
          ...inputStyle,
          minHeight: 120,
          resize: "vertical",
          lineHeight: 1.5,
        }}
      />

      <div
        style={{
          textAlign: "right",
          fontSize: 10,
          color: "#9ca3af",
          marginTop: 4,
        }}
      >
        {(chapter.description || "").length}/850
      </div>
    </div>
  )
}
