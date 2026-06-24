export default function AnnotationPanel() {
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 10 }}>
        Annotation
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 12,
          fontSize: 13,
          color: "#d1d5db",
        }}
      >
        Marker mode ada di toolbar bawah. Pilih Bab terlebih dahulu, lalu aktifkan Marker untuk menambahkan annotation ke Bab aktif.
      </div>
    </div>
  )
}
