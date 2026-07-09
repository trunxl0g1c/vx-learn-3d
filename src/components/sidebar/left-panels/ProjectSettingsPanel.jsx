import { FileText, ImageIcon, Trash2, Video } from "lucide-react";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import {
  getViewerBackground,
  getViewerBackgroundStyle,
  normalizeViewerHdri,
} from "../../../utils/viewerBackground";
import Button from "../../ui/button";
import SelectField from "../../ui/select";
import ColorFieldInput from "./attributes/ColorFieldInput";

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

function resizeImageDataUrl(
  dataUrl,
  { maxWidth = 900, maxHeight = 520, quality = 0.86 } = {},
) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        1,
        maxWidth / image.width,
        maxHeight / image.height,
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

function getMediaAccept(type) {
  if (type === "IMAGE") return "image/*";
  if (type === "VIDEO") return "video/*";
  return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function getMediaIcon(type, className = "size-7 text-secondary-default") {
  if (type === "IMAGE") return <ImageIcon className={className} />;
  if (type === "VIDEO") return <Video className={className} />;
  return <FileText className={className} />;
}

function getMediaLabel(type) {
  if (type === "IMAGE") return "Image";
  if (type === "VIDEO") return "Video";
  return "Document";
}

function getMediaTitle(file, type) {
  if (file?.name) return file.name;
  return `Untitled ${getMediaLabel(type)}`;
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
    const isSupported =
      lowerName.endsWith(".hdr") || lowerName.endsWith(".exr");

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

  const addProjectMedia = async (type, file) => {
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);

    setMaterial((prev) => ({
      ...prev,
      media: [
        ...(prev.media || []),
        {
          id: crypto.randomUUID(),
          type,
          title: getMediaTitle(file, type),
          name: file.name || getMediaTitle(file, type),
          mimeType: file.type || "application/octet-stream",
          size: file.size || 0,
          url: dataUrl,
          dataUrl,
          addedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const removeProjectMedia = (mediaId) => {
    setMaterial((prev) => ({
      ...prev,
      media: (prev.media || []).filter((item) => item.id !== mediaId),
    }));
  };

  const mediaList = Array.isArray(material.media) ? material.media : [];

  return (
    <div className="flex h-full flex-col text-white">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-normal">
        Project Settings
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
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
              className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 pr-14 text-sm font-normal text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-2 right-3 text-[10px] font-normal text-contrast-grayout">
              {titleLength}/48
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-normal text-contrast-grayout">
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
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
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
              className="min-h-[146px] w-full resize-none rounded-lg border border-secondary-default bg-transparent px-3 py-3 pr-12 text-sm font-normal leading-6 text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-[#67D4EA]"
            />

            <span className="absolute bottom-3 right-3 text-[10px] font-normal text-contrast-grayout">
              {descriptionLength}/650
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
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
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-normal text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
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
            className="h-[44px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-normal text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-[#67D4EA]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            Project Thumbnail
          </label>

          <div className="rounded-lg border border-secondary-default bg-primary p-3">
            <div className="flex items-center gap-4">
              <div className="grid h-18 w-28 shrink-0 place-items-center overflow-hidden rounded border border-secondary-default bg-primary">
                {material.thumbnail ? (
                  <img
                    src={material.thumbnail}
                    alt="Project thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-9 text-contrast-grayout" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-normal text-white">
                  {material.thumbnailName || "Project thumbnail"}
                </div>
                <p className="mt-1 text-xs font-normal text-contrast-grayout">
                  Upload an image or capture the current 3D viewport.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="cursor-pointer grid h-9 place-items-center rounded-lg border border-[#315b64] text-xs font-normal text-white transition hover:border-secondary-default">
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
                className="cursor-pointer h-9 rounded-lg border border-[#315b64] text-xs font-normal text-white transition hover:border-secondary-default"
              >
                Capture
              </button>

              <button
                type="button"
                disabled={!material.thumbnail}
                onClick={() => updateThumbnail("")}
                className="cursor-pointer h-9 rounded-lg border border-[#315b64] text-xs font-normal text-white transition hover:border-secondary-default hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            Media
          </label>

          <div className="space-y-3">
            {mediaList.length > 0 && (
              <div className="space-y-2">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-secondary-default bg-primary p-3"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#315b64] bg-dark-alpha">
                      {item.type === "IMAGE" && item.url ? (
                        <img
                          src={item.url}
                          alt={item.title || item.name || "Project media"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getMediaIcon(item.type, "size-6 text-secondary-default")
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-normal text-white">
                        {item.title || item.name || `Untitled ${getMediaLabel(item.type)}`}
                      </div>
                      <div className="mt-1 text-xs font-normal text-contrast-grayout">
                        {getMediaLabel(item.type)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProjectMedia(item.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#315b64] text-contrast-grayout transition hover:border-secondary-default hover:text-white"
                      aria-label="Remove media"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "IMAGE", label: "Add Image" },
                { type: "VIDEO", label: "Add Video" },
                { type: "DOCUMENT", label: "Add Document" },
              ].map((item) => (
                <label
                  key={item.type}
                  title={item.label}
                  aria-label={item.label}
                  className="grid h-12 cursor-pointer place-items-center rounded-lg border border-secondary-default bg-primary text-white transition hover:border-secondary-default hover:bg-dark-alpha"
                >
                  {getMediaIcon(item.type, "size-5 text-secondary-default")}
                  <input
                    type="file"
                    accept={getMediaAccept(item.type)}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      await addProjectMedia(item.type, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-4 text-sm font-normal text-white">Environment</div>

          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            HDRI Lighting
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={hdri.source === "preset" ? "default" : "outline"}
              type="button"
              onClick={() =>
                updateHdri({
                  hdriSource: "preset",
                  hdri: hdri.hdri || "/hdr/studio.hdr",
                })
              }
            >
              Preset HDRI
            </Button>

            <Button
              asChild
              size="sm"
              variant={hdri.source === "custom" ? "default" : "outline"}
            >
              <label>
                Import HDRI
                <input
                  type="file"
                  accept=".hdr,.exr"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImportHdri(file);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
          </div>

          {hdri.source == "custom" ? (
            <div className="mb-4 rounded-lg border border-secondary-default bg-primary px-3 py-3">
              <div className="text-xs font-normal uppercase tracking-wide">
                Custom HDRI
              </div>
              <div className="mt-1 truncate text-sm font-normal text-white">
                {hdri.customHdri?.name || "No custom HDRI selected"}
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  updateHdri({
                    hdriSource: "preset",
                    hdri: "/hdr/studio.hdr",
                    customHdri: null,
                  })
                }
                className="mt-3 w-full"
              >
                Remove Custom HDRI
              </Button>
            </div>
          ) : (
            <SelectField
              value={viewerSettings?.hdri || ""}
              options={HDRI_PRESETS}
              onChange={(value) =>
                updateHdri({
                  hdriSource: "preset",
                  hdri: value,
                })
              }
            />
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-normal text-contrast-grayout">
              Show HDRI as background
            </span>
            <Switch
              checked={viewerSettings?.showHdriBackground || false}
              onCheckedChange={(checked) =>
                updateHdri({ showHdriBackground: checked })
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-2 text-sm font-normal text-white">Background</div>

          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            Background Type
          </label>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <Button
              size="sm"
              type="button"
              variant={background.type === "solid" ? "default" : "outline"}
              onClick={() => updateBackground({ type: "solid" })}
            >
              Solid
            </Button>

            <Button
              size="sm"
              type="button"
              variant={
                background.type === "radialGradient" ? "default" : "outline"
              }
              onClick={() => updateBackground({ type: "radialGradient" })}
            >
              Radial
            </Button>

            <Button
              size="sm"
              type="button"
              variant={background.type === "image" ? "default" : "outline"}
            >
              <label>
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
            </Button>
          </div>

          <div className="space-y-3">
            {background.type === "solid" && (
              <ColorFieldInput
                label="Solid Color"
                value={background.solidColor}
                onChange={(value) => updateBackground({ solidColor: value })}
              />
            )}

            {background.type === "radialGradient" && (
              <>
                <ColorFieldInput
                  label="Center Color"
                  value={background.centerColor}
                  onChange={(value) => updateBackground({ centerColor: value })}
                />

                <ColorFieldInput
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
                <div className="rounded-lg border border-secondary-dark bg-primary px-3 py-3 text-sm font-semibold text-white">
                  {background.imageName || "No background image selected"}
                </div>

                <SelectField
                  value={background.imageFit || "cover"}
                  onChange={(value) => updateBackground({ imageFit: value })}
                  options={[
                    { label: "Cover", value: "cover" },
                    { label: "Contain", value: "contain" },
                    { label: "Stretch", value: "stretch" },
                  ]}
                />

                <Slider
                  label="Image Opacity"
                  value={background.imageOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) =>
                    updateBackground({ imageOpacity: value })
                  }
                />
              </>
            )}

            <div>
              <div className="mb-2 text-sm font-normal text-white">
                Preview
              </div>
              <div
                className="h-[132px] w-full rounded-lg border border-[#6b7280]"
                style={getViewerBackgroundStyle(viewerSettings)}
                title="Background preview"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-normal text-contrast-grayout">
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
