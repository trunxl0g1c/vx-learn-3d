import { DEFAULT_BLINK_SELECTION_SETTINGS } from "../../engine/selection";
import { DEFAULT_VIEWER_GRID } from "../../engine/viewer";
import { DEFAULT_XR_SETTINGS } from "../../engine/xr";
import { DEFAULT_VIEWER_BACKGROUND } from "../../utils/viewerBackground";

export function createDefaultViewerSettings() {
  return {
    exposure: 0.75,
    ambientLight: 0.5,
    mainLight: 0.8,
    fillLight: 0.5,
    hemiLight: 0.5,
    envIntensity: 0.8,
    hdri: "/hdr/studio.hdr",
    hdriSource: "preset",
    customHdri: null,
    showHdriBackground: false,
    shaderMode: "original",
    metalness: 0.1,
    roughness: 0.1,
    cameraProjectionMode: "perspective",
    blinkSettings: { ...DEFAULT_BLINK_SELECTION_SETTINGS },
    background: { ...DEFAULT_VIEWER_BACKGROUND },
    grid: { ...DEFAULT_VIEWER_GRID },
    xr: {
      vr: { ...DEFAULT_XR_SETTINGS.vr },
      ar: { ...DEFAULT_XR_SETTINGS.ar },
    },
  };
}

export default createDefaultViewerSettings;
