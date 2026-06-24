export default function CutSectionSlider({ cutX, cutMin, cutMax, setCutX }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 120,
        transform: "translateX(-50%)",
        zIndex: 120,
        width: 360,
        padding: 12,
        borderRadius: 14,
        background: "rgba(15,23,42,0.78)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
      }}
    >
      <div
        style={{
          fontSize: 12,
          marginBottom: 8,
        }}
      >
        Cut X: {cutX.toFixed(2)}
      </div>

      <input
        type="range"
        min={cutMin}
        max={cutMax}
        step="0.01"
        value={cutX}
        onChange={(e) => setCutX(Number(e.target.value))}
        style={{ width: "100%" }}
      />
    </div>
  )
}
