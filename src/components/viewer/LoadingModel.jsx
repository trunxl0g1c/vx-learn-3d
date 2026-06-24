import { Html, useProgress } from '@react-three/drei'

export default function LoadingModel() {
  const { progress } = useProgress()
  const percent = Math.round(progress || 0)

  return (
    <Html center>
      <div
        style={{
          background: "white",
          padding: "24px 28px",
          borderRadius: 12,
          boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
          minWidth: 320,
          textAlign: "center",
          color: "#111827",
        }}
      >
        <div
          style={{
            marginBottom: 14,
            fontWeight: "bold",
            fontSize: 20,
            color: "#111827",
          }}
        >
          Loading 3D Object...
        </div>

        <div
          style={{
            width: "100%",
            height: 12,
            background: "#ddd",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: "#4caf50",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            fontWeight: "bold",
            color: "#111827",
          }}
        >
          {percent}%
        </div>
      </div>
    </Html>
  )
}
