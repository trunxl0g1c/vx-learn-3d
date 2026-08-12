import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

export default function PlayerXRControls({ xr }) {
  if (!xr) return null;

  const showVR = xr.settings?.vr?.enabled;
  const showAR = xr.settings?.ar?.enabled;
  if (!showVR && !showAR) return null;

  if (xr.activeMode) {
    return (
      <div className="absolute right-5 bottom-5 z-[70] flex items-center gap-2 rounded-xl border border-divider-main bg-primary/85 p-2 backdrop-blur-xl">
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
    <div className="absolute right-5 bottom-5 z-[70] flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-divider-main bg-primary/85 p-2 backdrop-blur-xl">
        {showVR && (
          <Button
            type="button"
            size="xs"
            variant="cyanOutline"
            onClick={xr.enterVR}
            disabled={!xr.rendererReady || xr.support.vr === false}
            title={xr.support.vr === false ? "Immersive VR is not supported on this device" : "Enter VR"}
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
            disabled={!xr.rendererReady || xr.support.ar === false}
            title={xr.support.ar === false ? "Immersive AR is not supported on this device" : "View in AR"}
          >
            <MaterialIcon name="deployed_code" className="size-4" />
            View in AR
          </Button>
        )}
      </div>

      {xr.error && (
        <div className="max-w-sm rounded-lg border border-red-400/40 bg-red-950/85 px-3 py-2 text-[10px] text-red-200 backdrop-blur-xl">
          {xr.error}
        </div>
      )}
    </div>
  );
}
