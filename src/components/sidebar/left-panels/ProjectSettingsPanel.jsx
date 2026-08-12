import { Camera, FileText, ImageIcon, Trash2, Video } from "lucide-react";
import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import {
  getViewerBackground,
  getViewerBackgroundStyle,
} from "../../../utils/viewerBackground";
import Button from "../../ui/button";
import SelectField from "../../ui/select";
import ColorFieldInput from "./attributes/ColorFieldInput";
import TurntableAnimationSettings from "./TurntableAnimationSettings";
import StageBackgroundControls from "./StageBackgroundControls";
import GridSettingsControls from "./GridSettingsControls";
import ProToolsSettingsControls from "./ProToolsSettingsControls";
import InlineAlert from "../../ui/inline-alert";
import { useState } from "react";
import { normalizePlayerSettings } from "../../../modules/material/playerSettings";
import { createId } from "../../../utils/createId";
import { normalizeBlinkSelectionSettings } from "../../../engine/selection";

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

  const captureViewport = window.__EDITOR_CAPTURE_VIEWPORT__;
  const dataUrl =
    typeof captureViewport === "function"
      ? captureViewport()
      : canvas.toDataURL("image/png");

  return resizeImageDataUrl(dataUrl);
}

export default function ProjectSettingsPanel({
  material,
  setMaterial,
  viewerSettings,
  setViewerSettings,
  saveDefaultPlayerCameraView,
}) {
  const titleLength = material.title?.length || 0;
  const descriptionLength = material.description?.length || 0;
  const background = getViewerBackground(viewerSettings);
  const blinkSettings = normalizeBlinkSelectionSettings(
    viewerSettings?.blinkSettings,
  );

  const [panelError, setPanelError] = useState("");

  const showPanelError = (message) => {
    setPanelError(message);
  };

  const clearPanelError = () => {
    setPanelError("");
  };

  const updateBackground = (patch) => {
    setViewerSettings?.((prev) => ({
      ...prev,
      background: {
        ...background,
        ...patch,
      },
    }));
  };

  const updateBlinkSettings = (patch) => {
    setViewerSettings?.((prev) => ({
      ...prev,
      blinkSettings: normalizeBlinkSelectionSettings({
        ...prev?.blinkSettings,
        ...patch,
      }),
    }));
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
      alert("Thumbnail must be an image.");
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
      alert(error?.message || "Failed to capture viewport.");
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
          id: createId(),
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
  const playerSettings = normalizePlayerSettings(material.playerSettings);
  const turntableAnimation = playerSettings.turntableAnimation;

  const updatePlayerSettings = (patch) => {
    setMaterial((prev) => {
      const currentSettings = normalizePlayerSettings(prev.playerSettings);

      return {
        ...prev,
        playerSettings: {
          ...currentSettings,
          ...patch,
          turntableAnimation: patch.turntableAnimation
            ? normalizePlayerSettings({
                ...currentSettings,
                turntableAnimation: {
                  ...currentSettings.turntableAnimation,
                  ...patch.turntableAnimation,
                },
              }).turntableAnimation
            : currentSettings.turntableAnimation,
          menuVisibility: patch.menuVisibility
            ? {
                ...currentSettings.menuVisibility,
                ...patch.menuVisibility,
              }
            : currentSettings.menuVisibility,
        },
      };
    });
  };

  const updatePlayerMenuVisibility = (key, checked) => {
    updatePlayerSettings({
      menuVisibility: {
        [key]: checked,
      },
    });
  };

  const handleSaveDefaultPlayerCameraView = () => {
    clearPanelError();

    const didSave = saveDefaultPlayerCameraView?.();

    if (!didSave) {
      showPanelError(
        "Camera viewport belum siap. Tunggu model tampil lalu coba simpan kembali.",
      );
    }
  };

  return (
    <div className="flex h-full flex-col text-white">
      <div className="sticky top-0 z-10 flex h-16 items-center bg-[#14201f] px-4 text-lg font-normal">
        Project Settings
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        <InlineAlert
          type="error"
          message={panelError}
          duration={3000}
          onClose={() => setPanelError("")}
        />

        <div>
          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            Title
          </label>

          <div className="relative">
            <input
              value={material.title || ""}
              maxLength={48}
              placeholder="Project title"
              onChange={(event) => {
                clearPanelError();

                setMaterial((previousMaterial) => ({
                  ...previousMaterial,
                  title: event.target.value,
                }));
              }}
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

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-4 text-sm font-normal text-white">Media</div>

          <div className="space-y-3">
            {mediaList.length > 0 && (
              <div className="space-y-2">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-secondary-default bg-dark-alpha p-3"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#315b64] bg-primary">
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
                        {item.title ||
                          item.name ||
                          `Untitled ${getMediaLabel(item.type)}`}
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
                  className="grid h-12 cursor-pointer place-items-center rounded-lg border border-secondary-default bg-dark-alpha text-white transition hover:bg-dark-alpha/70"
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

        <ProToolsSettingsControls
          settings={material.proToolsSettings}
          onChange={(nextSettings) =>
            setMaterial((prev) => ({
              ...prev,
              proToolsSettings: nextSettings,
            }))
          }
        />

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-4 text-sm font-normal text-white">
            Player Settings
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-normal text-contrast-grayout">
                Auto Show Materi
              </span>

              <Switch
                checked={playerSettings.autoShowMaterial}
                onCheckedChange={(checked) =>
                  updatePlayerSettings({ autoShowMaterial: checked })
                }
              />
            </div>


            <div className="border-t border-white/10 pt-4">
              <Button
                type="button"
                onClick={handleSaveDefaultPlayerCameraView}
                className="w-full my-3"
              >
                <Camera className="size-4" />
                {playerSettings.defaultCameraView
                  ? "Update Default Camera View"
                  : "Save Default Camera View"}
              </Button>

              <p className="mt-2 text-xs leading-5 text-contrast-grayout">
                Posisi kamera Editor saat ini akan menjadi tampilan awal serta
                target Reset View dan Reset All di Player.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="mb-4 text-xs font-bold uppercase tracking-wide text-contrast-grayout">
                Player Menu
              </div>

              <div className="space-y-4">
                {[
                  ["environmentSettings", "Environment Settings"],
                  ["objectList", "Object List"],
                  ["freePlay", "Free Play"],
                  ["pullApart", "Pull Apart"],
                  ["cut", "Cut"],
                ].map(([key, label], index) => (
                  <div
                    key={key}
                    className={[
                      "flex items-center justify-between gap-4",
                      index > 0 ? "border-t border-white/10 pt-4" : "",
                    ].join(" ")}
                  >
                    <span className="text-sm font-normal text-contrast-grayout">
                      {label}
                    </span>

                    <Switch
                      checked={playerSettings.menuVisibility[key]}
                      onCheckedChange={(checked) =>
                        updatePlayerMenuVisibility(key, checked)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <TurntableAnimationSettings
          settings={turntableAnimation}
          onChange={(nextSettings) =>
            updatePlayerSettings({ turntableAnimation: nextSettings })
          }
        />

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-2 text-sm font-normal text-white">
            Blink Selected Objects
          </div>

          <p className="mb-4 text-xs leading-5 text-contrast-grayout">
            Pengaturan ini digunakan oleh tombol Blink Selected Objects pada
            menu Multiple Select dan ikut disimpan bersama camera view Chapter.
          </p>

          <div className="space-y-4">
            <Slider
              label="Blink Thickness"
              value={blinkSettings.thickness}
              min={1}
              max={20}
              step={0.5}
              onChange={(value) =>
                updateBlinkSettings({ thickness: Number(value) })
              }
            />

            <ColorFieldInput
              label="Blink Color"
              value={blinkSettings.color}
              onChange={(value) => updateBlinkSettings({ color: value })}
            />

            <Slider
              label="Blink Speed"
              value={blinkSettings.speed}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(value) =>
                updateBlinkSettings({ speed: Number(value) })
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-secondary-default bg-primary p-4">
          <div className="mb-2 text-sm font-normal text-white">Background</div>

          <label className="mb-2 block text-sm font-normal text-contrast-grayout">
            Background Type
          </label>

          <div className="mb-4 grid grid-cols-2 gap-2">
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
              variant={
                background.type === "linearGradient" ? "default" : "outline"
              }
              onClick={() => updateBackground({ type: "linearGradient" })}
            >
              Linear
            </Button>

            <Button
              size="sm"
              type="button"
              variant={background.type === "stage" ? "default" : "outline"}
              onClick={() => updateBackground({ type: "stage" })}
            >
              Stage
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

            {background.type === "linearGradient" && (
              <>
                <ColorFieldInput
                  label="Start Color"
                  value={background.linearStartColor}
                  onChange={(value) =>
                    updateBackground({ linearStartColor: value })
                  }
                />

                <ColorFieldInput
                  label="End Color"
                  value={background.linearEndColor}
                  onChange={(value) =>
                    updateBackground({ linearEndColor: value })
                  }
                />

                <Slider
                  label="Linear Width"
                  value={background.linearWidth}
                  min={0.05}
                  max={1}
                  step={0.05}
                  onChange={(value) => updateBackground({ linearWidth: value })}
                />

                <Slider
                  label="Linear Position"
                  value={background.linearPosition}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) =>
                    updateBackground({ linearPosition: value })
                  }
                />

                <Slider
                  label="Linear Rotation"
                  value={background.linearRotation}
                  min={0}
                  max={360}
                  step={5}
                  onChange={(value) =>
                    updateBackground({ linearRotation: value })
                  }
                />
              </>
            )}

            {background.type === "stage" && (
              <StageBackgroundControls
                background={background}
                updateBackground={updateBackground}
              />
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

            <GridSettingsControls
              viewerSettings={viewerSettings}
              setViewerSettings={setViewerSettings}
            />

            <div>
              <div className="mb-2 text-sm font-normal text-white">Preview</div>
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
