import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

function Marker({ marker, baseScale = 0.02 }) {
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

    const dynamicScale = Math.min(
      Math.max(distance * baseScale, 0.02),
      0.18
    )

    groupRef.current.scale.setScalar(dynamicScale)
  })

  const lineEnd = [8, 5, 0]
  const labelPos = [10, 5, 0]

  return (
    <group ref={groupRef} position={position}>
      <mesh>
       <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([
                0, 0, 0,
                lineEnd[0], lineEnd[1], lineEnd[2],
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="black" />
      </line>

      <Html position={labelPos} center occlude={false}>
        <div
          style={{
            background: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #999',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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