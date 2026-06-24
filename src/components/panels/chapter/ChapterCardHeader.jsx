export default function ChapterCardHeader({ chapter, index, isActive }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        marginBottom: isActive ? 12 : 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: "bold",
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {chapter.title || `Bab ${index + 1}`}
        </div>

        {!isActive && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {chapter.objectName}
          </div>
        )}
      </div>

      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: isActive ? "#67e8f9" : "#64748b",
          flexShrink: 0,
        }}
      />
    </div>
  )
}
