import { ImageIcon } from "lucide-react";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import {
  getViewerBackground,
  getViewerBackgroundStyle,
} from "../../../utils/viewerBackground";

export default function ProjectSettingsPanel({
  material,
  setMaterial,
  viewerSettings,
  setViewerSettings,
}) {
  const titleLength = material.title?.length || 0;
  const descriptionLength = material.description?.length || 0;
  const background = getViewerBackground(viewerSettings);

  const updateBackground = (patch) => {
    setViewerSettings?.((prev) => ({
      ...prev,
      background: {
        ...background,
        ...patch,
      },
    }));
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-semibold">
        Project Settings
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Title
          </label>

          <div className="relative">
            <input
              value={material.title || ""}
              maxLength={48}
              placeholder="Project title"
              onChange={(e) =>
                setMaterial((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 pr-14 text-sm font-semibold text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-2 right-3 text-[10px] font-semibold text-[#86899B]">
              {titleLength}/48
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Description
          </label>

          <div className="relative">
            <textarea
              value={material.description || ""}
              maxLength={650}
              placeholder="Project description..."
              onChange={(e) =>
                setMaterial((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="min-h-[146px] w-full resize-none rounded-lg border border-secondary-default bg-transparent px-3 py-3 pr-12 text-sm font-semibold leading-6 text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-[#86899B]">
              {descriptionLength}/650
            </span>
          </div>
        </div>
        
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Version
          </label>

          <input
            value={material.version || ""}
            placeholder="1.0.0"
            onChange={(e) =>
              setMaterial((prev) => ({
                ...prev,
                version: e.target.value,
              }))
            }
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-semibold text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Author
          </label>

          <input
            value={material.author || ""}
            placeholder="Author name"
            onChange={(e) =>
              setMaterial((prev) => ({
                ...prev,
                author: e.target.value,
              }))
            }
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-semibold text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>


        <div>
          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Thumbnail
          </label>

          <label className="flex h-[96px] cursor-pointer items-center gap-4 rounded-lg border border-[#2E7E87] bg-[#14201f] px-3 transition hover:border-secondary-default">
            <div className="grid h-[72px] w-[96px] shrink-0 place-items-center overflow-hidden rounded border border-secondary-default bg-[#3A3150]">
              {material.thumbnail ? (
                <img
                  src={material.thumbnail}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="size-9 text-[#9CA0AA]" />
              )}
            </div>

            <span className="text-sm font-semibold text-white">
              Add Picture
            </span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = () => {
                  setMaterial((prev) => ({
                    ...prev,
                    thumbnail: reader.result,
                    thumbnailName: file.name,
                    thumbnailType: file.type,
                  }));
                };

                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        <div className="rounded-xl border border-[#2E7E87] bg-[#14201f]/70 p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Background</span>
            <span className="rounded-full bg-[#0088c9] px-2 py-0.5 text-[10px] font-bold text-white">
              NEW
            </span>
          </div>

          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Background Type
          </label>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateBackground({ type: "solid" })}
              className={[
                "h-10 rounded-lg border text-sm font-semibold transition",
                background.type === "solid"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Solid Color
            </button>

            <button
              type="button"
              onClick={() => updateBackground({ type: "radialGradient" })}
              className={[
                "h-10 rounded-lg border text-sm font-semibold transition",
                background.type === "radialGradient"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Radial Gradient
            </button>
          </div>

          <div className="grid grid-cols-[1fr_112px] gap-4">
            <div className="space-y-3">
              {background.type === "solid" && (
                <ColorField
                  label="Solid Color"
                  value={background.solidColor}
                  onChange={(value) => updateBackground({ solidColor: value })}
                />
              )}

              {background.type === "radialGradient" && (
                <>
                  <ColorField
                    label="Center Color"
                    value={background.centerColor}
                    onChange={(value) => updateBackground({ centerColor: value })}
                  />

                  <ColorField
                    label="Edge Color"
                    value={background.edgeColor}
                    onChange={(value) => updateBackground({ edgeColor: value })}
                  />
                </>
              )}
            </div>

            <div
              className="h-[146px] rounded-lg border border-[#6b7280]"
              style={getViewerBackgroundStyle(viewerSettings)}
              title="Background preview"
            />
          </div>

          {background.type === "radialGradient" && (
            <div className="mt-4">
              <Slider
                label="Gradient Intensity"
                value={background.intensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(value) => updateBackground({ intensity: value })}
              />

              <p className="mt-2 text-xs font-semibold text-[#86899B]">
                Higher values create stronger contrast between center and edge.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-[#86899B]">
            Available on the marketplace
          </span>

          <Switch
            checked={material.availableOnMarketplace || false}
            onCheckedChange={(checked) =>
              setMaterial((prev) => ({
                ...prev,
                availableOnMarketplace: checked,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-[#B7BBC8]">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 cursor-pointer rounded-lg border border-[#315b64] bg-transparent p-1"
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-[#315b64] bg-[#1b2427] px-3 text-sm font-semibold text-white outline-none focus:border-secondary-default"
        />
      </div>
    </div>
  );
}
