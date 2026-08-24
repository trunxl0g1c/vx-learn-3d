import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

function getARTitle(xr) {
  if (xr.arStrategy === "quick-look") {
    if (xr.quickLook?.preparing) return "Preparing this model for Apple AR Quick Look";
    if (xr.quickLook?.ready) return "Open this model in Apple AR Quick Look";
    return "Prepare this model for Apple AR Quick Look";
  }
  if (xr.platform?.isAndroid) {
    return xr.support.ar === false
      ? "WebXR AR is not available on this Android device/browser"
      : "Start Android WebXR AR";
  }
  if (xr.platform?.isQuest) return "Start passthrough WebXR AR";
  return xr.support.ar === false
    ? "Immersive AR is not supported on this device"
    : "View in AR";
}

function getARLabel(xr) {
  if (xr.arStrategy === "quick-look") {
    if (xr.quickLook?.preparing) return "Preparing Apple AR...";
    if (xr.quickLook?.ready) return `Open ${xr.platform?.label || "Apple"} AR`;
    return `Prepare ${xr.platform?.label || "Apple"} AR`;
  }
  if (xr.platform?.isAndroid) return "View in Android AR";
  return "View in AR";
}

export default function PlayerXRControls({ xr }) {
  if (!xr) return null;

  const showVR = xr.settings?.vr?.enabled;
  const showAR = xr.settings?.ar?.enabled;
  if (!showVR && !showAR) return null;

  if (xr.activeMode) {
    return (
      <div className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 right-2 z-[10000] flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-divider-main bg-primary/85 p-2 backdrop-blur-xl md:left-auto md:right-5 md:bottom-5">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-default">
          {xr.activeMode === "vr" ? "VR Session" : "AR Session"}
        </span>
        <Button type="button" size="xs" variant="cyanOutline" onClick={xr.exit}>
          Exit XR
        </Button>
      </div>
    );
  }

  return (
    <div className="vx-player-xr-controls absolute bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-2 right-2 z-[70] flex min-w-0 flex-col items-stretch gap-2 md:bottom-5 md:left-auto md:right-5 md:max-w-[calc(100vw-2.5rem)] md:items-end">
      <div className="vx-player-xr-controls__actions flex max-w-full items-center justify-start gap-2 overflow-x-auto rounded-xl border border-divider-main bg-primary/85 p-2 backdrop-blur-xl md:justify-end">
        {showVR && (
          <Button
            type="button"
            size="xs"
            variant="cyanOutline"
            onClick={xr.enterVR}
            disabled={!xr.rendererReady || xr.support.vr === false}
            title={xr.support.vr === false ? "Immersive VR is not supported on this device" : "Enter VR"}
            className="shrink-0 whitespace-nowrap"
          >
            <MaterialIcon name="view_in_ar" className="size-4" />
            Enter VR
          </Button>
        )}
        {showAR && (
          <Button
            type="button"
            size="xs"
            variant="cyanOutline"
            onClick={xr.enterAR}
            disabled={!xr.canEnterAR}
            title={getARTitle(xr)}
            className="shrink-0 whitespace-nowrap"
          >
            <MaterialIcon name="deployed_code" className="size-4" />
            {getARLabel(xr)}
          </Button>
        )}
      </div>


      {xr.error && (
        <div className="max-h-[28dvh] w-full overflow-y-auto rounded-lg border border-red-400/40 bg-red-950/85 px-3 py-2 text-[10px] text-red-200 backdrop-blur-xl md:max-w-sm">
          {xr.error}
        </div>
      )}
    </div>
  );
}
