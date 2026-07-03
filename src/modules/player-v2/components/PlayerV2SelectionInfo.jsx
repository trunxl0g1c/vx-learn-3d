export default function PlayerV2SelectionInfo({ selection, camera }) {
  const info = selection?.selectedInfo

  if (!info) return null

  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 84,
        zIndex: 30,
        width: 280,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(15, 23, 42, 0.88)",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        color: "#e2e8f0",
        boxShadow: "0 18px 45px rgba(0,0,0,0.32)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 800 }}>
        Selected Object
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 15,
          fontWeight: 800,
          wordBreak: "break-word",
        }}
      >
        {info.name}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
        Type: {info.type}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>
        Meshes: {info.meshCount}
      </div>

      {info.chapterTitle && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(37, 99, 235, 0.18)",
            border: "1px solid rgba(96, 165, 250, 0.24)",
            color: "#bfdbfe",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Chapter: {info.chapterTitle}
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={camera?.focusSelectedObject}
          style={{
            width: "100%",
            border: "1px solid rgba(96, 165, 250, 0.45)",
            background: "rgba(37, 99, 235, 0.28)",
            color: "#dbeafe",
            borderRadius: 10,
            padding: "8px 10px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Focus Selected (F)
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={camera?.resetCamera}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(30, 41, 59, 0.9)",
              color: "#e2e8f0",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Reset (R)
          </button>

          <button
            type="button"
            onClick={camera?.restoreCameraState}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "rgba(30, 41, 59, 0.9)",
              color: "#e2e8f0",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Restore (B)
          </button>
        </div>

        <button
          type="button"
          onClick={selection.clearSelection}
          style={{
            width: "100%",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            background: "rgba(30, 41, 59, 0.9)",
            color: "#e2e8f0",
            borderRadius: 10,
            padding: "8px 10px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Clear Selection
        </button>
      </div>
    </div>
  )
}
