import { useThree } from "@react-three/fiber"
import { useOrbitPointerPivot } from "../../hooks/useOrbitPointerPivot"

/**
 * Canvas bridge only. Native OrbitControls remains responsible for rotation;
 * this controller only asks the camera layer to smoothly re-center when the
 * visible model is clearly off-center or outside the frame. Already-good views
 * rotate immediately without changing their framing.
 */
export default function OrbitPointerPivotController({
  controlsRef,
  modelScene,
  enabled = true,
}) {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useOrbitPointerPivot({
    controlsRef,
    camera,
    domElement,
    modelScene,
    enabled,
  })

  return null
}
