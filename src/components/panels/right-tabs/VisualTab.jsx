import { ChevronDown } from "lucide-react";
import Button from "../../ui/button";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import SelectField from "../../ui/select";

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
  } = props;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-normal">
        Environment Settings
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["original", "Original"],
              ["toon", "Toon"],
              ["wireframe", "Wire"],
              ["xray", "X-Ray"],
              ["clay", "Clay"],
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

          <Slider
            label="Metalness"
            value={metalness}
            min={0}
            max={1}
            step={0.01}
            onChange={setMetalness}
          />

          <Slider
            label="Roughness"
            value={roughness}
            min={0}
            max={1}
            step={0.01}
            onChange={setRoughness}
          />

          <Slider
            label="Exposure"
            value={viewerSettings.exposure}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(value) => {
              setViewerSettings((prev) => ({
                ...prev,
                exposure: value,
              }));

              if (window.__EDITOR_RENDERER__) {
                window.__EDITOR_RENDERER__.toneMappingExposure = value;
              }
            }}
          />

          <Slider
            label="Ambient Light"
            value={viewerSettings.ambientLight}
            min={0}
            max={5}
            step={0.1}
            onChange={(value) =>
              setViewerSettings((prev) => ({
                ...prev,
                ambientLight: value,
              }))
            }
          />

          <Slider
            label="Main Light"
            value={viewerSettings.mainLight}
            min={0}
            max={8}
            step={0.1}
            onChange={(value) =>
              setViewerSettings((prev) => ({
                ...prev,
                mainLight: value,
              }))
            }
          />

          <Slider
            label="Fill Light"
            value={viewerSettings.fillLight}
            min={0}
            max={5}
            step={0.1}
            onChange={(value) =>
              setViewerSettings((prev) => ({
                ...prev,
                fillLight: value,
              }))
            }
          />

          <Slider
            label="Hemisphere Light"
            value={viewerSettings.hemiLight}
            min={0}
            max={5}
            step={0.1}
            onChange={(value) =>
              setViewerSettings((prev) => ({
                ...prev,
                hemiLight: value,
              }))
            }
          />

          <Slider
            label="Environment Intensity"
            value={viewerSettings.envIntensity}
            min={0}
            max={8}
            step={0.1}
            onChange={updateEnvIntensity}
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
