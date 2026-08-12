import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import Switch from "../ui/switch";

const inputClass =
  "h-8 rounded-lg border border-divider-main bg-primary/70 px-2.5 text-[11px] text-white outline-none focus:border-secondary-default";

function SettingToggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-divider-main bg-primary/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white">{label}</p>
        {description && (
          <p className="mt-0.5 text-[10px] leading-4 text-contrast-grayout">
            {description}
          </p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function SupportBadge({ supported, checking, label }) {
  const text = checking
    ? "Checking..."
    : supported === null
      ? "Not checked"
      : supported
        ? "Supported"
        : "Not supported here";

  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-[9px] font-semibold",
        supported === true
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
          : supported === false
            ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
            : "border-divider-main text-contrast-grayout",
      ].join(" ")}
    >
      {label}: {text}
    </span>
  );
}

export default function XRWorkspaceDock({ xrAuthoring, onOpenPlayerPreview }) {
  if (!xrAuthoring?.isAuthoringActive) return null;

  const { settings, activeMode } = xrAuthoring;
  const modeSettings = activeMode === "vr" ? settings.vr : settings.ar;

  return (
    <section className="absolute bottom-0 left-[60px] right-0 z-[150] flex h-[360px] min-w-0 flex-col overflow-hidden border-t border-divider-main bg-[#101717]/98 text-white shadow-[0_-16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-divider-main bg-[#172020] px-3">
        <button
          type="button"
          onClick={xrAuthoring.stopAuthoring}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
          title="Back to Pro Tools"
        >
          <MaterialIcon name="arrow_back" className="size-5" />
        </button>

        <div className="mr-2 shrink-0">
          <p className="text-xs font-semibold">XR / Immersive</p>
          <p className="text-[9px] text-contrast-grayout">VR + AR authoring</p>
        </div>

        <div className="flex rounded-lg border border-divider-main bg-primary/60 p-1">
          {[
            ["vr", "VR", "view_in_ar"],
            ["ar", "AR", "deployed_code"],
          ].map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => xrAuthoring.setActiveMode(id)}
              className={[
                "flex h-7 items-center gap-1.5 rounded-md px-3 text-[10px] font-semibold transition",
                activeMode === id
                  ? "bg-accent-main text-white"
                  : "text-contrast-grayout hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <MaterialIcon name={icon} className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SupportBadge
            label="VR"
            supported={xrAuthoring.support.vr}
            checking={xrAuthoring.supportChecking}
          />
          <SupportBadge
            label="AR"
            supported={xrAuthoring.support.ar}
            checking={xrAuthoring.supportChecking}
          />
          <Button
            type="button"
            size="xs"
            variant="cyanOutline"
            onClick={xrAuthoring.refreshSupport}
            disabled={xrAuthoring.supportChecking}
          >
            <MaterialIcon name="refresh" className="size-4" />
            Check Device
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={onOpenPlayerPreview}
          >
            <MaterialIcon name="play_arrow" className="size-4" />
            Open Player
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activeMode === "vr" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <div className="space-y-3">
              <SettingToggle
                label="Enable VR"
                description="Show Enter VR in Player when immersive-vr is supported."
                checked={settings.vr.enabled}
                onChange={(enabled) => xrAuthoring.updateVR({ enabled })}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span className="uppercase tracking-wide">Initial Scale</span>
                  <input
                    type="number"
                    min="0.01"
                    max="20"
                    step="0.1"
                    value={settings.vr.scale}
                    onChange={(event) =>
                      xrAuthoring.updateVR({ scale: Number(event.target.value) || 1 })
                    }
                    className={`${inputClass} w-full`}
                  />
                </label>

                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span className="uppercase tracking-wide">Locomotion</span>
                  <select
                    value={settings.vr.locomotion}
                    onChange={(event) =>
                      xrAuthoring.updateVR({ locomotion: event.target.value })
                    }
                    className={`${inputClass} w-full`}
                  >
                    <option value="teleport" className="bg-primary">Teleport</option>
                    <option value="smooth" className="bg-primary">Smooth</option>
                    <option value="stationary" className="bg-primary">Stationary</option>
                  </select>
                </label>

                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span className="uppercase tracking-wide">Hand Tracking</span>
                  <select
                    value={settings.vr.handTracking}
                    onChange={(event) =>
                      xrAuthoring.updateVR({ handTracking: event.target.value })
                    }
                    className={`${inputClass} w-full`}
                  >
                    <option value="auto" className="bg-primary">Auto</option>
                    <option value="on" className="bg-primary">Prefer On</option>
                    <option value="off" className="bg-primary">Off</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <SettingToggle
                  label="Controller Ray"
                  checked={settings.vr.controllerRay}
                  onChange={(controllerRay) => xrAuthoring.updateVR({ controllerRay })}
                />
                <SettingToggle
                  label="Grab Interaction"
                  description="Saved for XR interaction policy."
                  checked={settings.vr.grabInteraction}
                  onChange={(grabInteraction) =>
                    xrAuthoring.updateVR({ grabInteraction })
                  }
                />
                <SettingToggle
                  label="Show Grid"
                  checked={settings.vr.showGrid}
                  onChange={(showGrid) => xrAuthoring.updateVR({ showGrid })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-divider-main bg-primary/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <MaterialIcon name="person_pin_circle" className="size-5 text-secondary-default" />
                <p className="text-xs font-semibold">VR Spawn</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span>Distance</span>
                  <input
                    type="number"
                    min="0.25"
                    max="20"
                    step="0.1"
                    value={settings.vr.spawnDistance}
                    onChange={(event) =>
                      xrAuthoring.updateVR({
                        spawnDistance: Number(event.target.value) || 2,
                      })
                    }
                    className={`${inputClass} w-full`}
                  />
                </label>
                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span>Height Offset</span>
                  <input
                    type="number"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={settings.vr.spawnHeight}
                    onChange={(event) =>
                      xrAuthoring.updateVR({
                        spawnHeight: Number(event.target.value) || 0,
                      })
                    }
                    className={`${inputClass} w-full`}
                  />
                </label>
              </div>
              <Button
                type="button"
                size="xs"
                variant="cyanOutline"
                onClick={xrAuthoring.saveCurrentViewAsVRSpawn}
                className="mt-3"
              >
                <MaterialIcon name="photo_camera" className="size-4" />
                Use Current View Distance
              </Button>
              <p className="mt-2 text-[9px] leading-4 text-contrast-grayout">
                Player VR places the model in front of the viewer using this saved distance.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <div className="space-y-3">
              <SettingToggle
                label="Enable AR"
                description="Show View in AR in Player when immersive-ar is supported."
                checked={settings.ar.enabled}
                onChange={(enabled) => xrAuthoring.updateAR({ enabled })}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span className="uppercase tracking-wide">Placement</span>
                  <select
                    value={settings.ar.placement}
                    onChange={(event) =>
                      xrAuthoring.updateAR({ placement: event.target.value })
                    }
                    className={`${inputClass} w-full`}
                  >
                    <option value="surface" className="bg-primary">Surface / Hit Test</option>
                    <option value="fixed" className="bg-primary">Fixed</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] text-contrast-grayout">
                  <span className="uppercase tracking-wide">Initial Scale</span>
                  <input
                    type="number"
                    min="0.01"
                    max="20"
                    step="0.1"
                    value={settings.ar.scale}
                    onChange={(event) =>
                      xrAuthoring.updateAR({ scale: Number(event.target.value) || 1 })
                    }
                    className={`${inputClass} w-full`}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SettingToggle
                  label="Allow Move"
                  checked={settings.ar.allowMove}
                  onChange={(allowMove) => xrAuthoring.updateAR({ allowMove })}
                />
                <SettingToggle
                  label="Allow Rotate"
                  checked={settings.ar.allowRotate}
                  onChange={(allowRotate) => xrAuthoring.updateAR({ allowRotate })}
                />
                <SettingToggle
                  label="Allow Scale"
                  checked={settings.ar.allowScale}
                  onChange={(allowScale) => xrAuthoring.updateAR({ allowScale })}
                />
                <SettingToggle
                  label="Show Grid"
                  checked={settings.ar.showGrid}
                  onChange={(showGrid) => xrAuthoring.updateAR({ showGrid })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-divider-main bg-primary/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <MaterialIcon name="view_in_ar" className="size-5 text-secondary-default" />
                <p className="text-xs font-semibold">AR Surface Placement</p>
              </div>
              <p className="text-[10px] leading-5 text-contrast-grayout">
                Surface mode requests WebXR hit-test. In Player AR a reticle appears on a detected surface; tap/select to place the model.
              </p>
              <div className="mt-3 rounded-lg border border-secondary-default/30 bg-[#0b1212] p-3 text-[10px] leading-5 text-contrast-grayout">
                Advanced real-machine alignment, depth occlusion, anchors and QR calibration are intentionally outside this first XR implementation.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
