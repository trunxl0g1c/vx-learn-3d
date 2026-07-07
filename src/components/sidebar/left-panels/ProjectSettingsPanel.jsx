import { ImageIcon } from "lucide-react";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import {
  getViewerBackground,
  getViewerBackgroundStyle,
  normalizeViewerHdri,
} from "../../../utils/viewerBackground";

const HDRI_PRESETS = [
  { label: "None", value: "" },
  { label: "Studio", value: "/hdr/studio.hdr" },
  { label: "Warehouse", value: "/hdr/warehouse.hdr" },
  { label: "Sunset", value: "/hdr/sunset.hdr" },
  { label: "Hangar", value: "/hdr/hangar.hdr" },
  { label: "Industrial", value: "/hdr/industrial.hdr" },
  { label: "Empty Hangar", value: "/hdr/emptyhangar.hdr" },
  { label: "Cape Hill", value: "/hdr/capehill.hdr" },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl, { maxWidth = 900, maxHeight = 520, quality = 0.86 } = {}) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        1,
        maxWidth / image.width,
        maxHeight / image.height
      );

      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function readImageFileAsThumbnail(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return resizeImageDataUrl(dataUrl);
}

function waitForNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

async function waitForBackgroundTextureReady(timeout = 1200) {
  const startedAt = Date.now();

  while (window.__VX_VIEWER_BACKGROUND_READY__ === false) {
    if (Date.now() - startedAt > timeout) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function captureViewportThumbnail() {
  const renderer = window.__EDITOR_RENDERER__;
  const canvas = renderer?.domElement;

  if (!canvas) {
    throw new Error("Viewport belum siap untuk di-capture.");
  }

  await waitForBackgroundTextureReady();
  await waitForNextFrame();

  const dataUrl = canvas.toDataURL("image/png");
  return resizeImageDataUrl(dataUrl);
}

export default function ProjectSettingsPanel({
  material,
  setMaterial,
  viewerSettings,
  setViewerSettings,
}) {
  const titleLength = material.title?.length || 0;
  const descriptionLength = material.description?.length || 0;
  const background = getViewerBackground(viewerSettings);
  const hdri = normalizeViewerHdri(viewerSettings);

  const updateBackground = (patch) => {
    setViewerSettings?.((prev) => ({
      ...prev,
      background: {
        ...background,
        ...patch,
      },
    }));
  };

  const updateHdri = (patch) => {
    setViewerSettings?.((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleImportHdri = async (file) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isSupported = lowerName.endsWith(".hdr") || lowerName.endsWith(".exr");

    if (!isSupported) {
      alert("File HDRI harus berformat .hdr atau .exr");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);

    updateHdri({
      hdriSource: "custom",
      hdri: dataUrl,
      customHdri: {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        importedAt: new Date().toISOString(),
      },
    });
  };


  const updateThumbnail = (thumbnail, metadata = {}) => {
    setMaterial((prev) => ({
      ...prev,
      thumbnail,
      thumbnailName: metadata.name || "",
      thumbnailType: metadata.type || "",
      thumbnailUpdatedAt: thumbnail ? new Date().toISOString() : null,
    }));
  };

  const handleImportThumbnail = async (file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      alert("Thumbnail harus berupa file gambar.");
      return;
    }

    const thumbnail = await readImageFileAsThumbnail(file);

    updateThumbnail(thumbnail, {
      name: file.name,
      type: file.type,
    });
  };

  const handleCaptureThumbnail = async () => {
    try {
      const thumbnail = await captureViewportThumbnail();

      updateThumbnail(thumbnail, {
        name: "Captured viewport",
        type: "image/jpeg",
      });
    } catch (error) {
      alert(error?.message || "Gagal mengambil thumbnail dari viewport.");
    }
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-normal">
        Project Settings
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        <div>
          <label className="mb-2 block text-sm font-normal text-[#86899B]">
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
              className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 pr-14 text-sm font-normal text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-2 right-3 text-[10px] font-normal text-[#86899B]">
              {titleLength}/48
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-normal text-[#86899B]">
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

        {/* THUMBNAIL */}

        <div>
          <label className="mb-2 block text-sm font-normal text-[#86899B]">
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
              className="min-h-[146px] w-full resize-none rounded-lg border border-secondary-default bg-transparent px-3 py-3 pr-12 text-sm font-normal leading-6 text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-3 right-3 text-[10px] font-normal text-[#86899B]">
              {descriptionLength}/650
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-[#86899B]">
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
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-normal text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-[#86899B]">
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
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-normal text-white outline-none placeholder:text-[#86899B] focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-[#86899B]">
            Media Content
          </label>

          <div className="rounded-lg border border-[#2E7E87] bg-[#14201f] p-3">
            <div className="flex items-center gap-4">
              <div className="grid h-[72px] w-[112px] shrink-0 place-items-center overflow-hidden rounded border border-secondary-default bg-[#3A3150]">
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

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {material.thumbnailName || "Project thumbnail"}
                </div>
                <p className="mt-1 text-xs font-semibold text-[#86899B]">
                  Upload an image or capture the current 3D viewport.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="grid h-9 cursor-pointer place-items-center rounded-lg border border-[#315b64] text-xs font-semibold text-white transition hover:border-secondary-default">
                {material.thumbnail ? "Change" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    await handleImportThumbnail(file);
                    e.target.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleCaptureThumbnail}
                className="h-9 rounded-lg border border-[#315b64] text-xs font-semibold text-white transition hover:border-secondary-default"
              >
                Capture
              </button>

              <button
                type="button"
                disabled={!material.thumbnail}
                onClick={() => updateThumbnail("")}
                className="h-9 rounded-lg border border-[#315b64] text-xs font-semibold text-[#B7BBC8] transition hover:border-secondary-default hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#2E7E87] bg-[#14201f]/70 p-4">
          <div className="mb-4 text-sm font-semibold text-white">Environment</div>

          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            HDRI Lighting
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                updateHdri({
                  hdriSource: "preset",
                  hdri: hdri.hdri || "/hdr/studio.hdr",
                })
              }
              className={[
                "h-10 rounded-lg border text-sm font-semibold transition",
                hdri.source !== "custom"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Preset HDRI
            </button>

            <label
              className={[
                "grid h-10 cursor-pointer place-items-center rounded-lg border text-sm font-semibold transition",
                hdri.source === "custom"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Import HDRI
              <input
                type="file"
                accept=".hdr,.exr"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleImportHdri(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {hdri.source === "custom" ? (
            <div className="mb-4 rounded-lg border border-[#315b64] bg-[#1b2427] px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#67D4EA]">
                Custom HDRI
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-white">
                {hdri.customHdri?.name || "No custom HDRI selected"}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHdri({
                    hdriSource: "preset",
                    hdri: "/hdr/studio.hdr",
                    customHdri: null,
                  })
                }
                className="mt-3 h-9 rounded-lg border border-[#315b64] px-3 text-xs font-semibold text-[#B7BBC8] hover:border-secondary-default hover:text-white"
              >
                Remove Custom HDRI
              </button>
            </div>
          ) : (
            <select
              value={viewerSettings?.hdri || ""}
              onChange={(e) =>
                updateHdri({
                  hdriSource: "preset",
                  hdri: e.target.value,
                })
              }
              className="mb-4 h-11 w-full rounded-lg border border-[#315b64] bg-[#1b2427] px-3 text-sm font-semibold text-white outline-none focus:border-secondary-default"
            >
              {HDRI_PRESETS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#86899B]">
              Show HDRI as background
            </span>
            <Switch
              checked={viewerSettings?.showHdriBackground || false}
              onCheckedChange={(checked) => updateHdri({ showHdriBackground: checked })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#2E7E87] bg-[#14201f]/70 p-4">
          <div className="mb-4 text-sm font-semibold text-white">Background</div>

          <label className="mb-2 block text-sm font-semibold text-[#86899B]">
            Background Type
          </label>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateBackground({ type: "solid" })}
              className={[
                "h-10 rounded-lg border text-xs font-semibold transition",
                background.type === "solid"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Solid
            </button>

            <button
              type="button"
              onClick={() => updateBackground({ type: "radialGradient" })}
              className={[
                "h-10 rounded-lg border text-xs font-semibold transition",
                background.type === "radialGradient"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Radial
            </button>

            <label
              className={[
                "grid h-10 cursor-pointer place-items-center rounded-lg border text-xs font-semibold transition",
                background.type === "image"
                  ? "border-secondary-default bg-[#087aa6] text-white"
                  : "border-[#315b64] bg-transparent text-white hover:border-secondary-default",
              ].join(" ")}
            >
              Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    updateBackground({
                      type: "image",
                      imageUrl: reader.result,
                      imageName: file.name,
                    });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

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

                <Slider
                  label="Gradient Size"
                  value={background.size}
                  min={0.2}
                  max={3}
                  step={0.05}
                  onChange={(value) => updateBackground({ size: value })}
                />

                <Slider
                  label="Gradient Intensity"
                  value={background.intensity}
                  min={0}
                  max={2}
                  step={0.05}
                  onChange={(value) => updateBackground({ intensity: value })}
                />
              </>
            )}

            {background.type === "image" && (
              <>
                <div className="rounded-lg border border-[#315b64] bg-[#1b2427] px-3 py-3 text-sm font-semibold text-white">
                  {background.imageName || "No background image selected"}
                </div>

                <select
                  value={background.imageFit}
                  onChange={(e) => updateBackground({ imageFit: e.target.value })}
                  className="h-11 w-full rounded-lg border border-[#315b64] bg-[#1b2427] px-3 text-sm font-semibold text-white outline-none focus:border-secondary-default"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="stretch">Stretch</option>
                </select>

                <Slider
                  label="Image Opacity"
                  value={background.imageOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => updateBackground({ imageOpacity: value })}
                />
              </>
            )}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#B7BBC8]">
                Preview
              </label>
              <div
                className="h-[132px] w-full rounded-lg border border-[#6b7280]"
                style={getViewerBackgroundStyle(viewerSettings)}
                title="Background preview"
              />
            </div>
          </div>
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
