export default function ChapterMediaSection({
  chapter,
  panelSectionStyle,
  mediaButtonStyle,
  addChapterMedia,
  deleteChapterMedia,
}) {
  return (
    <div style={panelSectionStyle}>
      <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
        Media
      </div>

      <label style={mediaButtonStyle}>
        <span style={{ fontSize: 22 }}>🖼️</span>
        <span>Add Picture</span>
        <input
          type="file"
          accept="image/*"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => addChapterMedia(chapter.id, "image", e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </label>

      <label style={mediaButtonStyle}>
        <span style={{ fontSize: 22 }}>🎬</span>
        <span>Add Video</span>
        <input
          type="file"
          accept="video/*"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => addChapterMedia(chapter.id, "video", e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </label>

      <label style={mediaButtonStyle}>
        <span style={{ fontSize: 22 }}>📄</span>
        <span>Add PDF Document</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => addChapterMedia(chapter.id, "pdf", e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </label>

      {(chapter.media || []).map((media) => (
        <div
          key={media.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            padding: 8,
            borderRadius: 8,
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: "bold",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {media.name}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>{media.type}</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteChapterMedia(chapter.id, media.id)
            }}
            style={{
              border: "none",
              background: "#7f1d1d",
              color: "white",
              borderRadius: 6,
              padding: "6px 8px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
