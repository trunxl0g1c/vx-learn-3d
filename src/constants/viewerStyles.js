export const panelSectionStyle = {
  background: "rgba(15,23,42,0.78)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: 10,
  marginBottom: 12,
}

export const inputStyle = {
  width: "100%",
  padding: 9,
  borderRadius: 7,
  border: "1px solid rgba(56,189,248,0.45)",
  background: "#111827",
  color: "white",
  boxSizing: "border-box",
}

export const mediaButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(56,189,248,0.28)",
  background: "rgba(15,23,42,0.78)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: 8,
  textAlign: "left",
}

export const viewportStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  background: 'linear-gradient(135deg,#0f172a 0%,#111827 45%,#1e293b 100%)',
}

export const toolbarDockStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 24,
  zIndex: 120,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
}

export const toolbarInnerStyle = {
  display: "flex",
  gap: 8,
  padding: 10,
  borderRadius: 14,
  background: "rgba(15,23,42,0.82)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.12)",
  pointerEvents: "auto",
}

export const toolButtonStyle = {
  padding: "9px 13px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: "bold",
}

export const menuStyle = {
  position: "absolute",
  left: "50%",
  bottom: 90,
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 10,
  borderRadius: 12,
  background: "rgba(15,23,42,0.92)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.12)",
  zIndex: 130,
}

export const menuButtonStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 8,
  background: "#374151",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
}
