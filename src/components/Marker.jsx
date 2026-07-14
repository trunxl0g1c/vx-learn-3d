import { Html } from '@react-three/drei'

const MARKER_SIZE = 24
const CONNECTOR_LENGTH = 76
const CONNECTOR_ANGLE = -132

function resolveMarkerPosition(marker) {
  if (Array.isArray(marker?.position)) {
    return marker.position
  }

  return [
    marker?.position?.x || 0,
    marker?.position?.y || 0,
    marker?.position?.z || 0,
  ]
}

/**
 * Screen-space marker callout.
 *
 * The marker is rendered with Drei Html instead of world-space geometry so its
 * dot, connector, and label keep the same pixel size while the camera zooms.
 * The zero-sized root keeps the white dot centered exactly on the stored 3D
 * position, similar to a Google Maps marker.
 */
function Marker({ marker }) {
  const position = resolveMarkerPosition(marker)
  const label = marker?.text || marker?.label || 'Marker'

  return (
    <Html
      position={position}
      center
      occlude={false}
      zIndexRange={[40, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        aria-label={label}
        style={{
          position: 'relative',
          width: 0,
          height: 0,
          overflow: 'visible',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${CONNECTOR_LENGTH}px`,
            height: '1.5px',
            background: 'rgba(18, 20, 22, 0.88)',
            transformOrigin: '0 50%',
            transform: `rotate(${CONNECTOR_ANGLE}deg)`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '44px',
            bottom: '52px',
            minWidth: 'max-content',
            padding: '7px 12px',
            border: '1px solid rgba(74, 78, 84, 0.9)',
            borderRadius: '7px',
            background: 'rgba(29, 30, 31, 0.96)',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.24)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${-MARKER_SIZE / 2}px`,
            top: `${-MARKER_SIZE / 2}px`,
            width: `${MARKER_SIZE}px`,
            height: `${MARKER_SIZE}px`,
            boxSizing: 'border-box',
            border: '2px solid #4a4650',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 2px 7px rgba(0, 0, 0, 0.34)',
          }}
        />
      </div>
    </Html>
  )
}

export default Marker
