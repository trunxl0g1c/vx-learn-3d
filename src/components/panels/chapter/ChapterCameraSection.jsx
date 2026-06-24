export default function ChapterCameraSection({ panelSectionStyle, saveCameraViewToActiveChapter }) {
  return (
    <div style={panelSectionStyle}>
      <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
        Camera View
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          saveCameraViewToActiveChapter()
        }}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "none",
          background: "#0f766e",
          color: "white",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        💾 Save Camera View
      </button>
    </div>
  )
}
