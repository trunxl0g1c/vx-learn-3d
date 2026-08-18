import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

function getARTitle(xr) {
  if (xr.arStrategy === "ios-tracked-ar") {
    if (!xr.platform?.isSecureContext) return "Tracked iPhone XR requires trusted HTTPS";
    if (xr.iosWebAR?.incompatible) return "This browser cannot run iPhone world tracking";
    return "Start world-tracked iPhone/iPad WebAR with the full Viqubed learning UI";
  }
  if (xr.arStrategy === "quick-look") {
    if (xr.quickLook?.preparing) return "Preparing this model for Apple AR Quick Look";
    return "Open this model in Apple AR Quick Look";
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
  if (xr.quickLook?.preparing && xr.arStrategy === "quick-look") return "Preparing AR...";
  if (xr.arStrategy === "ios-tracked-ar") {
    if (xr.iosWebAR?.loading) return "Loading iPhone AR...";
    return `Start ${xr.platform?.label || "iPhone"} XR`;
  }
  if (xr.arStrategy === "quick-look") return `View in ${xr.platform?.label || "Apple"} AR`;
  if (xr.platform?.isAndroid) return "View in Android AR";
  return "View in AR";
}

export default function PlayerXRControls({ xr }) {
  if (!xr) return null;

  const showVR = xr.settings?.vr?.enabled;
  const showAR = xr.settings?.ar?.enabled;
  if (!showVR && !showAR) return null;

  if (xr.activeMode) {
    const isIOSTrackedAR = xr.activeMode === "ios-tracked-ar";
    return (
      <>
        {isIOSTrackedAR && !xr.iosWebAR?.placed && (
          <div className="pointer-events-none absolute inset-0 z-[9998] grid place-items-center">
            <div className="relative size-14 rounded-full border border-secondary-default/80 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <span className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-secondary-default/90" />
              <span className="absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-secondary-default/90" />
            </div>
          </div>
        )}

        <div
          className={`absolute z-[10000] flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-2 rounded-xl border border-divider-main bg-primary/85 p-2 backdrop-blur-xl ${
            isIOSTrackedAR
              ? "left-2 right-2 top-[max(0.5rem,env(safe-area-inset-top))] justify-end md:left-auto md:right-5 md:top-5 md:max-w-[calc(100vw-5.5rem)]"
              : "bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 right-2 justify-end md:left-auto md:right-5 md:bottom-5"
          }`}
        >
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-default">
            {xr.activeMode === "vr"
              ? "VR Session"
              : isIOSTrackedAR
                ? xr.iosWebAR?.placed
                  ? `${xr.platform?.label || "iPhone"} World AR · Anchored`
                  : `${xr.platform?.label || "iPhone"} World AR · Aim & Place`
                : "AR Session"}
          </span>

          {isIOSTrackedAR && !xr.iosWebAR?.placed && (
            <Button
              type="button"
              size="xs"
              variant="default"
              onClick={xr.confirmIOSPlacement}
              title="Lock the model at the current tracked point"
            >
              <MaterialIcon name="location_on" className="size-4" />
              Place Model
            </Button>
          )}

          {isIOSTrackedAR && xr.iosWebAR?.placed && (
            <Button
              type="button"
              size="xs"
              variant="cyanOutline"
              onClick={xr.resetIOSPlacement}
              title="Move the tracked placement point again"
            >
              <MaterialIcon name="my_location" className="size-4" />
              Reposition
            </Button>
          )}

          <Button type="button" size="xs" variant="cyanOutline" onClick={xr.exit}>
            Exit XR
          </Button>
        </div>
      </>
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
            disabled={!xr.canEnterAR || xr.iosWebAR?.loading}
            title={getARTitle(xr)}
            className="shrink-0 whitespace-nowrap"
          >
            <MaterialIcon name="deployed_code" className="size-4" />
            {getARLabel(xr)}
          </Button>
        )}
        {showAR &&
          xr.platform?.isIOS &&
          xr.quickLook?.available &&
          typeof xr.enterQuickLook === "function" && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={xr.enterQuickLook}
              disabled={!xr.rendererReady || xr.quickLook?.preparing}
              title="Apple AR Quick Look: anchored native AR, but without Viqubed Material/Procedure UI"
              className="shrink-0 whitespace-nowrap"
            >
              <MaterialIcon name="view_in_ar" className="size-4" />
              Basic AR (No UI)
            </Button>
          )}
      </div>

      {showAR && xr.platform?.isIOS && xr.arStrategy === "ios-tracked-ar" && (
        <div className="max-h-[28dvh] w-full overflow-y-auto rounded-lg border border-divider-main bg-primary/85 px-3 py-2 text-[10px] text-secondary-default backdrop-blur-xl md:max-w-sm">
          {xr.platform?.isSecureContext
            ? xr.iosWebAR?.ready
              ? "World tracking is ready. Start XR, aim at the desired location, then tap Place Model. Material and Procedure stay in the normal Viqubed Player UI."
              : "Preparing iPhone world tracking. Keep this page open; when ready, Start iPhone XR will request Camera and Motion access."
            : "Tracked iPhone XR is blocked because this page is HTTP. Open the Player through trusted HTTPS. Basic AR can still use Quick Look, but it intentionally has no Viqubed UI."}
        </div>
      )}

      {xr.error && (
        <div className="max-h-[28dvh] w-full overflow-y-auto rounded-lg border border-red-400/40 bg-red-950/85 px-3 py-2 text-[10px] text-red-200 backdrop-blur-xl md:max-w-sm">
          {xr.error}
        </div>
      )}
    </div>
  );
}
