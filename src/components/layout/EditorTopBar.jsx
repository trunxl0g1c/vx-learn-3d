export default function EditorTopBar({ title }) {
  return (
    <div
      style={{
        height: 64,
        background: "#111827",
        borderBottom: "2px solid #0ea5e9",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        zIndex: 150,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ fontWeight: "bold", fontSize: 22, color: "#38bdf8" }}>
          VXPLORE
        </div>

        <div style={{ fontSize: 18, fontWeight: "bold" }}>
          {title || "VX Learn 3D"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            border: "1px solid #38bdf8",
            background: "transparent",
            color: "#bfdbfe",
            cursor: "pointer",
          }}
        >
          Share
        </button>

        <div>Admin</div>
      </div>
    </div>
  )
}
