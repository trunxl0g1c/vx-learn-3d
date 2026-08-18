import { Outline } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";

import {
  getBlinkSelectionOutlineProfile,
  normalizeBlinkSelectionSettings,
} from "../../engine/selection";

const BLINK_SELECTION_LAYER = 11;

const KERNEL_SIZE_BY_NAME = Object.freeze({
  verySmall: KernelSize.VERY_SMALL,
  small: KernelSize.SMALL,
  medium: KernelSize.MEDIUM,
  large: KernelSize.LARGE,
  veryLarge: KernelSize.VERY_LARGE,
  huge: KernelSize.HUGE,
});

function normalizeSelection(selection) {
  if (!Array.isArray(selection)) return [];

  return Array.from(
    new Set(
      selection.filter(
        (object) => object?.isObject3D && object?.visible !== false,
      ),
    ),
  );
}

export default function BlinkSelectionOutline({
  selection = [],
  settings = {},
  selectionLayer = BLINK_SELECTION_LAYER,
}) {
  const safeSelection = normalizeSelection(selection);

  if (safeSelection.length === 0) return null;

  const normalizedSettings = normalizeBlinkSelectionSettings(settings);
  const profile = getBlinkSelectionOutlineProfile(
    normalizedSettings.thickness,
  );

  return (
    <Outline
      selection={safeSelection}
      selectionLayer={selectionLayer}
      blendFunction={BlendFunction.SCREEN}
      edgeStrength={profile.edgeStrength}
      pulseSpeed={normalizedSettings.speed}
      visibleEdgeColor={normalizedSettings.color}
      hiddenEdgeColor={normalizedSettings.color}
      blur={profile.blur}
      kernelSize={KERNEL_SIZE_BY_NAME[profile.kernelSize]}
      resolutionScale={profile.resolutionScale}
      xRay
    />
  );
}
