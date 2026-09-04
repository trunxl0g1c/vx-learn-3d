import { ChevronDown, RotateCcw } from "lucide-react";
import Button from "../../ui/button";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import SelectField from "../../ui/select";
import { createDefaultViewerSettings } from "../../../hooks/viewer/createDefaultViewerSettings";

// Module-scope: these are plain numeric defaults (never mutated), so one
// shared instance is fine rather than recomputing per render.
const VIEWER_SETTINGS_DEFAULTS = createDefaultViewerSettings();

export default function VisualTab(props) {
  const {
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    updateEnvIntensity,
    material,
    activeChapterId,
    setActiveChapterId,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    animations,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    showHeader = true,
    className = "",
    contentClassName = "p-4",
    rendererGlobal = "__EDITOR_RENDERER__",
  } = props;

  const handleExposureChange = (value) => {
    setViewerSettings((prev) => ({
      ...prev,
      exposure: value,
    }));

    const renderer =
      typeof window !== "undefined" ? window[rendererGlobal] : null;

    if (renderer) {
      renderer.toneMappingExposure = value;
    }
  };

  const handleAmbientLightChange = (value) =>
    setViewerSettings((prev) => ({ ...prev, ambientLight: value }));

  const handleMainLightChange = (value) =>
    setViewerSettings((prev) => ({ ...prev, mainLight: value }));

  const handleFillLightChange = (value) =>
    setViewerSettings((prev) => ({ ...prev, fillLight: value }));

  const handleHemiLightChange = (value) =>
    setViewerSettings((prev) => ({ ...prev, hemiLight: value }));

  const handleResetAllViewerSettings = () => {
    setMetalness(VIEWER_SETTINGS_DEFAULTS.metalness);
    setRoughness(VIEWER_SETTINGS_DEFAULTS.roughness);
    handleExposureChange(VIEWER_SETTINGS_DEFAULTS.exposure);
    handleAmbientLightChange(VIEWER_SETTINGS_DEFAULTS.ambientLight);
    handleMainLightChange(VIEWER_SETTINGS_DEFAULTS.mainLight);
    handleFillLightChange(VIEWER_SETTINGS_DEFAULTS.fillLight);
    handleHemiLightChange(VIEWER_SETTINGS_DEFAULTS.hemiLight);
    updateEnvIntensity(VIEWER_SETTINGS_DEFAULTS.envIntensity);
  };

  return (
    <div
      className={[
        "flex h-full min-h-0 flex-col overflow-hidden",
        className,
      ].join(" ")}
    >
      {showHeader && (
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
          Environment Settings
        </div>
      )}

      <div
        className={[
          "sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
          contentClassName,
        ].join(" ")}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["original", "Original"],
              ["toon", "Toon"],
              ["wireframe", "Wire"],
              ["xray", "X-Ray"],
              ["clay", "Clay"],
              // ["2d", "2D"],
              ["sketch", "Sketch"],
            ].map(([mode, label]) => (
              <Button
                key={mode}
                size="sm"
                variant={shaderMode === mode ? "default" : "outline"}
                onClick={() => applyShaderMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleResetAllViewerSettings}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset All to Default
          </Button>

          <Slider
            label="Metalness"
            value={metalness}
            min={0}
            max={1}
            step={0.01}
            onChange={setMetalness}
            onReset={() => setMetalness(VIEWER_SETTINGS_DEFAULTS.metalness)}
          />

          <Slider
            label="Roughness"
            value={roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={setRoughness}
            onReset={() => setRoughness(VIEWER_SETTINGS_DEFAULTS.roughness)}
          />

          <Slider
            label="Exposure"
            value={viewerSettings.exposure}
            min={0.5}
            max={3}
            step={0.1}
            onChange={handleExposureChange}
            onReset={() =>
              handleExposureChange(VIEWER_SETTINGS_DEFAULTS.exposure)
            }
          />

          <Slider
            label="Ambient Light"
            value={viewerSettings.ambientLight}
            min={0}
            max={5}
            step={0.1}
            onChange={handleAmbientLightChange}
            onReset={() =>
              handleAmbientLightChange(VIEWER_SETTINGS_DEFAULTS.ambientLight)
            }
          />

          <Slider
            label="Main Light"
            value={viewerSettings.mainLight}
            min={0}
            max={8}
            step={0.1}
            onChange={handleMainLightChange}
            onReset={() =>
              handleMainLightChange(VIEWER_SETTINGS_DEFAULTS.mainLight)
            }
          />

          <Slider
            label="Fill Light"
            value={viewerSettings.fillLight}
            min={0}
            max={5}
            step={0.1}
            onChange={handleFillLightChange}
            onReset={() =>
              handleFillLightChange(VIEWER_SETTINGS_DEFAULTS.fillLight)
            }
          />

          <Slider
            label="Hemisphere Light"
            value={viewerSettings.hemiLight}
            min={0}
            max={5}
            step={0.1}
            onChange={handleHemiLightChange}
            onReset={() =>
              handleHemiLightChange(VIEWER_SETTINGS_DEFAULTS.hemiLight)
            }
          />

          <Slider
            label="Environment Intensity"
            value={viewerSettings.envIntensity}
            min={0}
            max={8}
            step={0.1}
            onChange={updateEnvIntensity}
            onReset={() =>
              updateEnvIntensity(VIEWER_SETTINGS_DEFAULTS.envIntensity)
            }
          />

          <div className="pt-2">
            <p className="mb-4 text-base font-normal text-contrast-grayout">
              HDRI
            </p>

            <SelectField
              value={viewerSettings.hdri || ""}
              onChange={(value) =>
                setViewerSettings((prev) => ({
                  ...prev,
                  hdri: value,
                  hdriSource: "preset",
                }))
              }
              options={[
                { label: "None", value: "" },
                { label: "Studio", value: "/hdr/studio.hdr" },
                { label: "Warehouse", value: "/hdr/warehouse.hdr" },
                { label: "Sunset", value: "/hdr/sunset.hdr" },
                { label: "Hangar", value: "/hdr/hangar.hdr" },
                { label: "Industrial", value: "/hdr/industrial.hdr" },
                { label: "Empty Hangar", value: "/hdr/emptyhangar.hdr" },
                { label: "Cape Hill", value: "/hdr/capehill.hdr" },
              ]}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-normal text-contrast-grayout">
              Show HDRI Background
            </span>

            <Switch
              checked={viewerSettings.showHdriBackground}
              onCheckedChange={(checked) =>
                setViewerSettings((prev) => ({
                  ...prev,
                  showHdriBackground: checked,
                }))
              }
              className="pointer-events-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
