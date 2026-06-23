import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

function Marker({ marker }) {
  const groupRef = useRef()
  const { camera } = useThree()

  const position = Array.isArray(marker.position)
    ? marker.position
    : [
        marker.position?.x || 0,
        marker.position?.y || 0,
        marker.position?.z || 0,
      ]

  useFrame(() => {
    if (!groupRef.current) return

    const distance = camera.position.distanceTo(groupRef.current.position)
    const scale = distance * 0.015

    groupRef.current.scale.setScalar(
      Math.min(Math.max(scale, 0.03), 0.18)
    )
  })

 const linePoints = [
  [0, 0, 0],
  [4, 0, 0],
  [8, 0, 0],
]

const labelPos = [9, 0, 0]

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[1.15, 24, 24]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.82, 24, 24]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      <Line
        points={linePoints}
        color="#facc15"
        lineWidth={3}
      />

      <Html position={labelPos} center occlude={false}>
        <div
          style={{
            background: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '2px solid #facc15',
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 10px rgba(250,204,21,0.45)',
            color: 'black',
          }}
        >
          {marker.text}
        </div>
      </Html>
    </group>
  )
}

export default Marker