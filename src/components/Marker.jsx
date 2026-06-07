import { Html } from '@react-three/drei'
function Marker({ marker }) {
  const lineEnd = [1, 0.6, 0]
  const labelPos = [1.3, 0.6, 0]

  return (
    <group position={marker.position}>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="red" />
      </mesh>

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              0, 0, 0,
              lineEnd[0], lineEnd[1], lineEnd[2]
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="black" />
      </line>

      <Html
        position={labelPos}
        center
        occlude={false}
      >
        <div style={{
          background: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid #999',
          fontSize: '13px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {marker.text}
        </div>
      </Html>
    </group>
  )
}

export default Marker