const sidebarItems = [
  { id: "hierarchy", icon: "📦", label: "Object Hierarchy", target: "hierarchy" },
  { id: "annotation", icon: "✏️", label: "Annotation", target: "annotation" },
  { id: "visual", icon: "💡", label: "Visual", target: "visual" },
  { id: "settings", icon: "⚙️", label: "Project Settings", target: "settings" },
]

export default function EditorSidebarRail({ activeSidebar, setActiveSidebar }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        top: 84,
        bottom: 20,
        width: 48,
        zIndex: 120,
        background: "rgba(15,23,42,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 12,
        gap: 12,
        boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
      }}
    >
      {sidebarItems.map((item) => (
        <button
          key={item.id}
          title={item.label}
          onClick={() => setActiveSidebar(item.target)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              activeSidebar === item.target
                ? "rgba(14,165,233,0.9)"
                : "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
