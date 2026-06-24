export default function ProjectSettingsPanel({ material, setMaterial }) {
  return (
    <>
      <div style={{ fontWeight: "bold", fontSize: 15, marginBottom: 14 }}>
        Project Settings
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
        Title
      </div>

      <input
        value={material.title}
        onChange={(e) =>
          setMaterial((prev) => ({
            ...prev,
            title: e.target.value,
          }))
        }
        maxLength={48}
        placeholder="Project title"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #38bdf8",
          background: "#111827",
          color: "white",
          marginBottom: 6,
          boxSizing: "border-box",
        }}
      />

      <div style={{ textAlign: "right", fontSize: 10, color: "#9ca3af", marginBottom: 14 }}>
        {material.title?.length || 0}/48
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
        Description
      </div>

      <textarea
        value={material.description || ""}
        onChange={(e) =>
          setMaterial((prev) => ({
            ...prev,
            description: e.target.value,
          }))
        }
        maxLength={650}
        placeholder="Project description..."
        style={{
          width: "100%",
          minHeight: 120,
          padding: 10,
          borderRadius: 8,
          border: "1px solid #38bdf8",
          background: "#111827",
          color: "white",
          resize: "vertical",
          marginBottom: 6,
          boxSizing: "border-box",
        }}
      />

      <div style={{ textAlign: "right", fontSize: 10, color: "#9ca3af", marginBottom: 14 }}>
        {(material.description || "").length}/650
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
        Thumbnail
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 12,
          borderRadius: 10,
          border: "1px solid rgba(56,189,248,0.5)",
          background: "rgba(15,23,42,0.8)",
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 56,
            borderRadius: 8,
            background: "#4c1d95",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {material.thumbnail ? (
            <img
              src={material.thumbnail}
              alt="Thumbnail"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 24 }}>🖼️</span>
          )}
        </div>

        <strong>Add Picture</strong>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return

            const reader = new FileReader()

            reader.onload = () => {
              setMaterial((prev) => ({
                ...prev,
                thumbnail: reader.result,
                thumbnailName: file.name,
                thumbnailType: file.type,
              }))
            }

            reader.readAsDataURL(file)
          }}
          style={{ display: "none" }}
        />
      </label>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        <span>Available on the marketplace</span>

        <input
          type="checkbox"
          checked={material.availableOnMarketplace || false}
          onChange={(e) =>
            setMaterial((prev) => ({
              ...prev,
              availableOnMarketplace: e.target.checked,
            }))
          }
        />
      </div>
    </>
  )
}
