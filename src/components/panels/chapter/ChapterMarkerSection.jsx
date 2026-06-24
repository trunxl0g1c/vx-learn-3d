export default function ChapterMarkerSection({
  chapter,
  panelSectionStyle,
  deleteMarkerFromActiveChapter,
}) {
  return (
    <div style={panelSectionStyle}>
      <div style={{ fontWeight: "bold", fontSize: 13 }}>Marker</div>

      {(chapter.markers || []).length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
          No marker has not been set yet
        </div>
      ) : (
        (chapter.markers || []).map((marker) => (
          <div
            key={marker.id}
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 8,
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 6 }}>{marker.text}</div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteMarkerFromActiveChapter(marker.id)
              }}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: "#dc2626",
                color: "white",
                cursor: "pointer",
              }}
            >
              Hapus Marker
            </button>
          </div>
        ))
      )}
    </div>
  )
}
