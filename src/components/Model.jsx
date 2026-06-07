import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'


function Model({ modelUrl, onAddMarker, onModelLoaded,  markerMode, onSelectObject }) {

  const { scene } = useGLTF(modelUrl)

  useEffect(() => {
  onModelLoaded(scene)
  }, [scene])

  useFrame(() => {

  scene.traverse((child) => {

    if (
      child.isMesh &&
      child.userData.targetPosition
    ) {

      child.position.lerp(
        child.userData.targetPosition,
        0.08
      )
    }
  })
})
  const handleClick = (e) => {
    e.stopPropagation()

    if (markerMode) {
      const text = prompt('Masukkan nama bagian:')

      if (!text) return

      onAddMarker({
        position: e.point,
        text: text
      })

      return
    }

    onSelectObject(e.object)
  }

  return (
    <primitive
      object={scene}
      onClick={handleClick}
    />
  )
}

export default Model